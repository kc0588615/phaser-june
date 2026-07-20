import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceCards } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { qualityTierForSuccessfulNode, decideObservationIssuance, getEliminatedCandidateIds, getRecord, hydrateObservation, isUuid, isV2SignatureInterpretationEligible, parseEvidenceCard, parseIssuedObservations, parsePrivateCase } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    const body = getRecord(await request.json().catch(() => ({})));
    const nodeIndex = body.nodeIndex;
    if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 3) {
      return NextResponse.json({ error: 'nodeIndex must be an integer from 0 through 3' }, { status: 400 });
    }

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid ORDER BY node_order FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (!playerId) return response(401, { error: 'Unauthorized' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (!privateCase) return response(409, { reason: 'legacy_run' });
      if (privateCase.version === 3) return response(409, { reason: 'v3_evidence_is_automatic' });
      const publicCase = parsePublicCaseSnapshot(metadata.casePublic);
      const issued = parseIssuedObservations(metadata.observationsIssued);
      const duplicate = issued.find(item => item.nodeIndex === nodeIndex);
      if (duplicate) return cardResponse(tx, duplicate.cardId, nodeIndex as number, duplicate.qualityTier);
      if (decideObservationIssuance(session.runStatus, false) === 'reject') return response(409, { reason: 'run_completed' });

      let cardId: number | undefined;
      let qualityTier: 1 | 2 | 3 | undefined;
      if ((nodeIndex as number) < 3) {
        const [node] = await tx.select({ status: ecoRunNodes.nodeStatus, target: ecoRunNodes.objectiveTarget, progress: ecoRunNodes.objectiveProgress, boardContext: ecoRunNodes.boardContext })
          .from(ecoRunNodes).where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, (nodeIndex as number) + 1))).limit(1);
        if (!node || node.status !== 'completed') return response(409, { reason: 'not_completed' });
        if (node.progress < node.target) return response(403, { reason: 'objective_failed' });
        if (privateCase.version === 2) {
          const context = getRecord(node.boardContext);
          const method = context.method;
          const best = typeof context.bestTargetMatchLength === 'number' ? context.bestTargetMatchLength : 0;
          qualityTier = qualityTierForSuccessfulNode(node.progress, node.target, best) ?? undefined;
          if (!qualityTier) return response(409, { reason: 'quality_missing' });
          if (typeof method !== 'string' || !(method in privateCase.cardIdMatrix)) return response(409, { reason: 'method_missing' });
          cardId = privateCase.cardIdMatrix[method as keyof typeof privateCase.cardIdMatrix][qualityTier - 1];
        } else {
          cardId = privateCase.chainCardIds[nodeIndex as number];
        }
      } else {
        if (privateCase.version === 1 && !privateCase.chainCardIds[3]) return response(200, { available: false, reason: 'no_signature' });
        const nodeStatuses = await tx.select({ status: ecoRunNodes.nodeStatus })
          .from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
        if (nodeStatuses.length !== 3 || nodeStatuses.some(node => node.status !== 'completed')) {
          return response(200, { available: false, reason: 'not_eligible' });
        }
        const committed = new Set((Array.isArray(metadata.reasoningEvents) ? metadata.reasoningEvents : []).flatMap(value => {
          const ref = getRecord(value).obsRef;
          return typeof ref === 'string' ? [ref] : [];
        }));
        const eligible = privateCase.version === 1
          ? [0, 1, 2].every(index => issued.some(item => item.nodeIndex === index) && committed.has(`obs-${index}`))
          : isV2SignatureInterpretationEligible(issued, committed);
        if (!eligible) {
          return response(200, { available: false, reason: 'not_eligible' });
        }
        if (privateCase.version === 2) {
          const candidateCount = (publicCase?.candidateIds.length ?? 0) - getEliminatedCandidateIds(metadata.reasoningEvents).size;
          if (candidateCount <= 1) return response(200, { available: false, reason: 'no_signature' });
          cardId = privateCase.signatureCardId;
        } else cardId = privateCase.chainCardIds[3];
      }

      if (!cardId) return response(200, { available: false, reason: 'no_signature' });
      const [row] = await tx.select().from(evidenceCards).where(eq(evidenceCards.id, cardId)).limit(1);
      const card = parseEvidenceCard(row);
      if (!card) return response(503, { error: 'Evidence card unavailable' });
      if (qualityTier && card.specificity !== qualityTier) return response(503, { error: 'Evidence quality matrix mismatch' });
      const issuance = { nodeIndex: nodeIndex as number, ref: `obs-${nodeIndex}`, cardId, issuedAt: new Date().toISOString(), ...(qualityTier ? { qualityTier } : {}) };
      await tx.update(ecoRunSessions).set({ metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ observationsIssued: [...issued, issuance] })}::jsonb` }).where(eq(ecoRunSessions.id, runId));
      return response(200, hydrateObservation(card, nodeIndex as number, qualityTier));
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/observations] Error:', error);
    return NextResponse.json({ error: 'Failed to issue observation' }, { status: 500 });
  }
}

async function cardResponse(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], cardId: number, nodeIndex: number, qualityTier?: 1 | 2 | 3) {
  const [row] = await tx.select().from(evidenceCards).where(eq(evidenceCards.id, cardId)).limit(1);
  const card = parseEvidenceCard(row);
  return card ? response(200, hydrateObservation(card, nodeIndex, qualityTier)) : response(503, { error: 'Evidence card unavailable' });
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }
