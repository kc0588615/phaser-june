import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceCards, runMemories, speciesDeductionProfiles } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { decideCheckpointMutation, getRecord, hydrateObservation, isUuid, parseEvidenceCard, parseIssuedObservations, verifyReasoningEventBatch } from '@/lib/runCaseState';
import { projectRunForClient } from '@/lib/runProjection';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const [session] = await db.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
    if (!session) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    if (session.playerId !== playerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [nodes, memories] = await Promise.all([
      db.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder),
      db.select().from(runMemories).where(eq(runMemories.runId, runId)).limit(1),
    ]);
    const issued = parseIssuedObservations(getRecord(session.metadata).observationsIssued);
    const cards = issued.length === 0 ? [] : await db.select().from(evidenceCards).where(inArray(evidenceCards.id, issued.map(item => item.cardId)));
    const publicObservations = issued.flatMap(item => {
      const card = parseEvidenceCard(cards.find(value => value.id === item.cardId));
      return card ? [hydrateObservation(card, item.nodeIndex)] : [];
    });
    return NextResponse.json(projectRunForClient(session, { nodes, memory: memories[0] ?? null, publicObservations }));
  } catch (error) {
    console.error('[API GET /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    const body = getRecord(await request.json().catch(() => ({})));
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return { status: 404, body: { error: 'Run not found' } };
      if (!playerId) return { status: 401, body: { error: 'Unauthorized' } };
      if (session.playerId !== playerId) return { status: 403, body: { error: 'Forbidden' } };

      const metadata = getRecord(session.metadata);
      const issued = parseIssuedObservations(metadata.observationsIssued);
      const requestedEvents = Array.isArray(body.reasoningEvents) ? body.reasoningEvents : [];
      const existingEvents = Array.isArray(metadata.reasoningEvents) ? metadata.reasoningEvents : [];
      const casePublic = getRecord(metadata.casePublic);
      const candidateIds = Array.isArray(casePublic.candidateIds)
        ? casePublic.candidateIds.filter((value): value is number => Number.isInteger(value)) : [];
      const cardRows = issued.length ? await tx.select().from(evidenceCards).where(inArray(evidenceCards.id, issued.map(item => item.cardId))) : [];
      const cards = new Map(cardRows.flatMap(row => { const card = parseEvidenceCard(row); return card ? [[row.id, card] as const] : []; }));
      const profiles = candidateIds.length ? await tx.select().from(speciesDeductionProfiles).where(inArray(speciesDeductionProfiles.speciesId, candidateIds)) : [];
      const verifiedBatch = verifyReasoningEventBatch(existingEvents, requestedEvents, issued, candidateIds, cards, profiles);
      if (verifiedBatch.error) return { status: 400, body: { error: verifiedBatch.error === 'unissued' ? 'Reasoning event references unissued observation' : verifiedBatch.error === 'out_of_order' ? 'Reasoning events must commit the issued prefix' : 'Invalid reasoning event' } };

      const patch: Record<string, unknown> = {};
      if (Number.isInteger(body.currentNodeIndex) && (body.currentNodeIndex as number) >= 0 && (body.currentNodeIndex as number) <= 2) patch.currentNodeIndex = body.currentNodeIndex;
      if (Number.isInteger(body.bankedScore) && (body.bankedScore as number) >= 0 && (body.bankedScore as number) <= 10_000_000) patch.bankedScore = body.bankedScore;
      if (Number.isInteger(body.objectiveProgress) && (body.objectiveProgress as number) >= 0 && (body.objectiveProgress as number) <= 1_000_000) patch.objectiveProgress = body.objectiveProgress;
      if (verifiedBatch.committedRefs.length > 0) patch.reasoningEvents = verifiedBatch.events;
      const changesState = Object.entries(patch).some(([key, value]) => key === 'reasoningEvents' || metadata[key] !== value);
      const terminalDecision = decideCheckpointMutation(session.runStatus, changesState);
      if (terminalDecision === 'reject') {
        return { status: 409, body: { error: 'Completed run is immutable' } };
      }
      if (terminalDecision === 'idempotent') {
        return { status: 200, body: { ok: true, checkpoint: { currentNodeIndex: null, bankedScore: null, objectiveProgress: null }, reasoningEventsCommitted: [] } };
      }
      if (Object.keys(patch).length > 0) {
        await tx.update(ecoRunSessions).set({ metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify(patch)}::jsonb` }).where(eq(ecoRunSessions.id, runId));
      }
      if (patch.currentNodeIndex !== undefined && patch.objectiveProgress !== undefined) {
        await tx.update(ecoRunNodes).set({ objectiveProgress: patch.objectiveProgress as number, updatedAt: new Date() }).where(and(
          eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, (patch.currentNodeIndex as number) + 1), sql`${ecoRunNodes.nodeStatus} <> 'completed'`,
        ));
      }
      return { status: 200, body: { ok: true, checkpoint: { currentNodeIndex: patch.currentNodeIndex ?? null, bankedScore: patch.bankedScore ?? null, objectiveProgress: patch.objectiveProgress ?? null }, reasoningEventsCommitted: verifiedBatch.committedRefs } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
