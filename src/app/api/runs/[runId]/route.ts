import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceCards, evidenceFamilyCards, runMemories, speciesDeductionProfiles } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getMethodOfferAtPath, isMethodType } from '@/expedition/caseOffers';
import { decideCheckpointMutation, decideQualityCheckpoint, getRecord, hydrateFamilyObservation, hydrateObservation, isUuid, parseEvidenceCard, parseEvidenceFamilyCard, parseIssuedObservations, parseV3EvidenceApplications, verifyReasoningEventBatch } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot, projectRunForClient } from '@/lib/runProjection';

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
    const metadata = getRecord(session.metadata);
    const casePublic = parsePublicCaseSnapshot(metadata.casePublic);
    const publicObservations = casePublic?.version === 3
      ? await hydrateV3Observations(metadata.evidenceApplications)
      : await hydrateV1V2Observations(metadata.observationsIssued);
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
      const casePublic = parsePublicCaseSnapshot(metadata.casePublic);
      if (casePublic?.version === 3 && requestedEvents.length > 0) {
        return { status: 400, body: { error: 'V3 evidence is applied automatically' } };
      }
      const candidateIds = casePublic?.candidateIds ?? [];
      const cardRows = issued.length ? await tx.select().from(evidenceCards).where(inArray(evidenceCards.id, issued.map(item => item.cardId))) : [];
      const cards = new Map(cardRows.flatMap(row => { const card = parseEvidenceCard(row); return card ? [[row.id, card] as const] : []; }));
      const profiles = candidateIds.length ? await tx.select().from(speciesDeductionProfiles).where(inArray(speciesDeductionProfiles.speciesId, candidateIds)) : [];
      const verifiedBatch = verifyReasoningEventBatch(existingEvents, requestedEvents, issued, candidateIds, cards, profiles);
      if (verifiedBatch.error) return { status: 400, body: { error: verifiedBatch.error === 'unissued' ? 'Reasoning event references unissued observation' : verifiedBatch.error === 'out_of_order' ? 'Reasoning events must commit the issued prefix' : 'Invalid reasoning event' } };

      const patch: Record<string, unknown> = {};
      if (Number.isInteger(body.currentNodeIndex) && (body.currentNodeIndex as number) >= 0 && (body.currentNodeIndex as number) <= 2) patch.currentNodeIndex = body.currentNodeIndex;
      if (Number.isInteger(body.bankedScore) && (body.bankedScore as number) >= 0 && (body.bankedScore as number) <= 10_000_000) patch.bankedScore = body.bankedScore;
      if (Number.isInteger(body.objectiveProgress) && (body.objectiveProgress as number) >= 0 && (body.objectiveProgress as number) <= 1_000_000) patch.objectiveProgress = body.objectiveProgress;
      let qualityResult: ReturnType<typeof decideQualityCheckpoint> | null = null;
      let checkpointNode: typeof ecoRunNodes.$inferSelect | null = null;
      if (body.bestTargetMatchLength !== undefined) {
        if (!Number.isInteger(body.currentNodeIndex) || (body.currentNodeIndex as number) < 0 || (body.currentNodeIndex as number) > 2) {
          return { status: 400, body: { error: 'Quality checkpoint requires currentNodeIndex' } };
        }
        await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid AND node_order = ${(body.currentNodeIndex as number) + 1} FOR UPDATE`);
        const [node] = await tx.select().from(ecoRunNodes).where(and(
          eq(ecoRunNodes.runId, runId),
          eq(ecoRunNodes.nodeOrder, (body.currentNodeIndex as number) + 1),
        )).limit(1);
        if (!node) return { status: 404, body: { error: 'Node not found' } };
        checkpointNode = node;
        qualityResult = decideQualityCheckpoint(node.nodeStatus, getRecord(node.boardContext).bestTargetMatchLength, body.bestTargetMatchLength);
        if (qualityResult.kind === 'reject') return { status: 409, body: { reason: qualityResult.reason } };
      }
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
      if (checkpointNode && qualityResult?.kind === 'store') {
        await tx.update(ecoRunNodes).set({
          boardContext: { ...getRecord(checkpointNode.boardContext), bestTargetMatchLength: qualityResult.bestTargetMatchLength },
          updatedAt: new Date(),
        }).where(eq(ecoRunNodes.id, checkpointNode.id));
      }
      if (patch.currentNodeIndex !== undefined && patch.objectiveProgress !== undefined) {
        await tx.update(ecoRunNodes).set({ objectiveProgress: patch.objectiveProgress as number, updatedAt: new Date() }).where(and(
          eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, (patch.currentNodeIndex as number) + 1), sql`${ecoRunNodes.nodeStatus} <> 'completed'`,
        ));
      }
      if (casePublic?.version === 2 && verifiedBatch.committedRefs.length > 0) {
        const regularIndexes = verifiedBatch.committedRefs.flatMap(ref => {
          const index = Number(ref.slice(4));
          return Number.isInteger(index) && index >= 0 && index < 2 ? [index] : [];
        });
        if (regularIndexes.length > 0) {
          const nodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
          for (const completedIndex of regularIndexes) {
            const nextIndex = completedIndex + 1;
            const nextNode = nodes[nextIndex];
            if (!nextNode) continue;
            const nextContext = getRecord(nextNode.boardContext);
            if (typeof nextContext.choiceOfferedAt === 'string') continue;
            const choices = nodes.slice(0, nextIndex).flatMap(node => {
              const method = getRecord(node.boardContext).method;
              return isMethodType(method) ? [method] : [];
            });
            const offeredMethods = getMethodOfferAtPath(casePublic.offerTree, choices);
            if (!offeredMethods) return { status: 409, body: { reason: 'invalid_offer_path' } };
            await tx.update(ecoRunNodes).set({
              boardContext: { ...nextContext, offeredMethods, choiceOfferedAt: new Date().toISOString() },
              updatedAt: new Date(),
            }).where(eq(ecoRunNodes.id, nextNode.id));
          }
        }
      }
      return { status: 200, body: { ok: true, checkpoint: { currentNodeIndex: patch.currentNodeIndex ?? null, bankedScore: patch.bankedScore ?? null, objectiveProgress: patch.objectiveProgress ?? null, bestTargetMatchLength: qualityResult?.bestTargetMatchLength ?? null }, reasoningEventsCommitted: verifiedBatch.committedRefs } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

async function hydrateV1V2Observations(value: unknown): Promise<Record<string, unknown>[]> {
  const issued = parseIssuedObservations(value);
  const cards = issued.length === 0 ? [] : await db.select().from(evidenceCards).where(inArray(evidenceCards.id, issued.map(item => item.cardId)));
  return issued.flatMap(item => {
    const card = parseEvidenceCard(cards.find(value => value.id === item.cardId));
    return card ? [hydrateObservation(card, item.nodeIndex, item.qualityTier)] : [];
  });
}

async function hydrateV3Observations(value: unknown): Promise<Record<string, unknown>[]> {
  const applications = parseV3EvidenceApplications(value);
  const cards = applications.length === 0 ? [] : await db.select().from(evidenceFamilyCards)
    .where(inArray(evidenceFamilyCards.id, applications.map(item => item.cardId)));
  return applications.flatMap(application => {
    const card = parseEvidenceFamilyCard(cards.find(value => value.id === application.cardId));
    return card ? [hydrateFamilyObservation(card, application)] : [];
  });
}
