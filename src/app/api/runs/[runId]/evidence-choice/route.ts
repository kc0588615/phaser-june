import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, speciesDeductionProfiles } from '@/db';
import { createEmptyEvidenceCharges, deriveEvidenceFamilyOffer } from '@/expedition/evidenceFamilies';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { parseEvidenceChoiceInput, parseV3NodeEvidenceState } from '@/lib/evidenceRunState';
import {
  computeActualEliminatedIds, getRecord, hydrateFamilyObservation, isUuid, parseEvidenceFamilyCard,
  parsePrivateCase, parseV3EvidenceApplications, type V3EvidenceApplicationRecord,
} from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const input = parseEvidenceChoiceInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: 'Invalid evidence choice' }, { status: 400 });
    const nodeOrder = input.nodeIndex + 1;
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid ORDER BY node_order FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const publicCase = parsePublicCaseSnapshot(metadata.casePublic);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (publicCase?.version !== 3 || privateCase?.version !== 3) return response(409, { error: 'Evidence choice requires a v3 run' });
      const nodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
      const node = nodes.find(candidate => candidate.nodeOrder === nodeOrder);
      if (!node) return response(404, { error: 'Node not found' });
      const applications = parseV3EvidenceApplications(metadata.evidenceApplications);
      const existing = applications.find(application => application.nodeIndex === input.nodeIndex);
      if (existing) {
        if (existing.family !== input.family) return response(409, { reason: 'choice_locked' });
        const card = parseEvidenceFamilyCard((await tx.select().from(evidenceFamilyCards).where(eq(evidenceFamilyCards.id, existing.cardId)).limit(1))[0]);
        const nextNode = nodes.find(candidate => candidate.nodeOrder === nodeOrder + 1);
        const nextState = nextNode ? parseV3NodeEvidenceState(nextNode.boardContext) : null;
        return card ? response(200, choiceBody(
          existing, card, true, nextState ? buildTravelEntry(getRecord(nextNode?.boardContext).waypoint) : null,
          nodeOrder >= 3, nextState?.evidenceCharges ?? createEmptyEvidenceCharges(),
          nextState?.selectedFamilies ?? applications.map(application => application.family), node.scoreEarned,
        )) : response(409, { reason: 'invalid_card' });
      }
      if (session.runStatus !== 'active' || node.nodeStatus !== 'active' || session.nodeIndexCurrent !== nodeOrder) return response(409, { reason: 'node_not_active' });
      const state = parseV3NodeEvidenceState(node.boardContext);
      if (!state || state.segmentMovesUsed !== 6 || !state.boardCheckpoint || state.selectedFamily) return response(409, { reason: 'segment_incomplete' });
      const exactOffer = deriveEvidenceFamilyOffer(state.evidenceCharges, state.selectedFamilies);
      if (exactOffer.join() !== state.offeredFamilies.join()) return response(409, { reason: 'invalid_offer_state' });
      if (!exactOffer.includes(input.family) || state.selectedFamilies.includes(input.family)) return response(409, { reason: 'family_not_offered' });
      const cardId = privateCase.familyCardIds[input.family];
      const card = parseEvidenceFamilyCard((await tx.select().from(evidenceFamilyCards).where(eq(evidenceFamilyCards.id, cardId)).limit(1))[0]);
      if (!card || card.family !== input.family) return response(409, { reason: 'invalid_card' });
      const candidateCards = await tx.select().from(evidenceFamilyCards).where(and(
        inArray(evidenceFamilyCards.speciesId, publicCase.candidateIds),
        eq(evidenceFamilyCards.family, input.family),
        eq(evidenceFamilyCards.reviewStatus, 'reviewed'),
      ));
      const candidateTraitPhrases = Object.fromEntries(candidateCards.map(candidate => [String(candidate.speciesId), candidate.traitPhrase]));
      if (candidateCards.length !== publicCase.candidateIds.length
        || publicCase.candidateIds.some(id => typeof candidateTraitPhrases[String(id)] !== 'string')) {
        return response(409, { reason: 'corpus_invariant_failed' });
      }
      const profiles = await tx.select().from(speciesDeductionProfiles).where(inArray(speciesDeductionProfiles.speciesId, publicCase.candidateIds));
      if (profiles.length !== publicCase.candidateIds.length) return response(409, { reason: 'corpus_invariant_failed' });
      const alreadyEliminated = applications.flatMap(application => application.actualEliminatedIds);
      const alreadyEliminatedSet = new Set(alreadyEliminated);
      const liveBefore = publicCase.candidateIds.filter(id => !alreadyEliminatedSet.has(id));
      const actualEliminatedIds = computeActualEliminatedIds(profiles, alreadyEliminated, card.traitCategory, card.compareTag);
      if (actualEliminatedIds.includes(privateCase.answerId)) return response(409, { reason: 'answer_eliminated' });
      const liveAfterCount = liveBefore.length - actualEliminatedIds.length;
      if (liveAfterCount < 2 || (input.nodeIndex === 2 && liveBefore.length >= 2 && actualEliminatedIds.length === 0)
        || (input.nodeIndex === 2 && liveAfterCount > 3)) return response(409, { reason: 'corpus_invariant_failed' });
      const eliminationReasons = Object.fromEntries(actualEliminatedIds.map(id => [String(id), eliminationReason(input.family)]));
      const application: V3EvidenceApplicationRecord = {
        nodeIndex: input.nodeIndex,
        ref: `obs-${input.nodeIndex}`,
        cardId,
        family: input.family,
        actualEliminatedIds,
        eliminationReasons,
        candidateTraitPhrases,
        issuedAt: new Date().toISOString(),
      };
      const selectedFamilies = [...state.selectedFamilies, input.family];
      const nextCharges = { ...state.evidenceCharges, [input.family]: 0 };
      const isLastNode = nodeOrder >= 3;
      const scoreEarned = state.boardCheckpoint.score;
      await tx.update(ecoRunNodes).set({
        nodeStatus: 'completed', objectiveProgress: 6, movesUsed: 6, scoreEarned,
        endedAt: new Date(), updatedAt: new Date(),
        boardContext: { ...getRecord(node.boardContext), selectedFamily: input.family, selectedFamilies, offeredFamilies: [] },
      }).where(eq(ecoRunNodes.id, node.id));
      let travelEntry: string | null = null;
      if (!isLastNode) {
        const nextNode = nodes.find(candidate => candidate.nodeOrder === nodeOrder + 1);
        if (!nextNode) return response(409, { reason: 'missing_next_node' });
        travelEntry = buildTravelEntry(getRecord(nextNode.boardContext).waypoint);
        await tx.update(ecoRunNodes).set({
          nodeStatus: 'active', startedAt: new Date(), updatedAt: new Date(),
          boardContext: {
            ...getRecord(nextNode.boardContext), caseVersion: 3, evidenceCharges: nextCharges,
            carriedCharges: nextCharges, hintCounts: createEmptyEvidenceCharges(), cascadeHintCount: 0,
            selectedFamilies, segmentMovesUsed: 0, offeredFamilies: [], lastHintIds: [], travelEntry,
          },
        }).where(eq(ecoRunNodes.id, nextNode.id));
      }
      const travelJournal = Array.isArray(metadata.travelJournal) ? metadata.travelJournal : [];
      await tx.update(ecoRunSessions).set({
        metadata: {
          ...metadata,
          evidenceApplications: [...applications, application],
          travelJournal: travelEntry ? [...travelJournal, travelEntry] : travelJournal,
          currentNodeIndex: isLastNode ? 2 : input.nodeIndex + 1,
        },
        scoreTotal: sql`${ecoRunSessions.scoreTotal} + ${scoreEarned}`,
        movesUsed: sql`${ecoRunSessions.movesUsed} + 6`,
        nodeIndexCurrent: isLastNode ? 3 : nodeOrder + 1,
        ...(isLastNode ? { runStatus: 'deduction' } : {}),
      }).where(eq(ecoRunSessions.id, runId));
      return response(200, choiceBody(application, card, false, travelEntry, isLastNode, nextCharges, selectedFamilies, scoreEarned));
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/evidence-choice] Error:', error);
    return NextResponse.json({ error: 'Failed to apply evidence choice' }, { status: 500 });
  }
}

function choiceBody(
  application: V3EvidenceApplicationRecord,
  card: NonNullable<ReturnType<typeof parseEvidenceFamilyCard>>,
  duplicate: boolean,
  travelEntry: string | null,
  isLastNode: boolean,
  evidenceCharges = createEmptyEvidenceCharges(),
  selectedFamilies = [application.family],
  scoreEarned = 0,
) {
  return {
    ok: true, duplicate, observation: hydrateFamilyObservation(card, application),
    evidenceCharges, selectedFamilies, travelEntry, isLastNode, scoreEarned,
    traitPhrase: card.traitPhrase,
    eliminationReasons: application.eliminationReasons,
  };
}

function eliminationReason(family: V3EvidenceApplicationRecord['family']): string {
  return {
    relatives: 'lineage mismatch',
    body: 'body mismatch',
    behavior: 'behavior mismatch',
    habits: 'diet mismatch',
    place: 'range mismatch',
  }[family];
}

function buildTravelEntry(value: unknown): string {
  const waypoint = getRecord(value);
  const name = typeof waypoint.name === 'string' && waypoint.name.trim() ? waypoint.name.trim() : 'the next survey area';
  const distKm = typeof waypoint.distKm === 'number' && Number.isFinite(waypoint.distKm) ? waypoint.distKm : null;
  return distKm === null
    ? `Next field site: near ${name}.`
    : `Next field site: near ${name}, ${Math.max(0, distKm).toFixed(1)} km from basecamp.`;
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }
