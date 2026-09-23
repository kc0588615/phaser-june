import { hypothesesFromMetadata, withExplanationNote } from '@/lib/liveClaims';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { cascadeHints, db, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, evidenceFamilyHints, speciesDeductionProfiles } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { applyEvidenceProgress, deriveCascadeHintId, parseV3NodeEvidenceState, shouldIssueCascadeHint, type EvidenceProgressInput } from '@/lib/evidenceRunState';
import {
  computeLadderEliminatedIds, hydrateLedgerFact, ledgerEliminatedIds, parseFactLedger, selectLadderIssues,
  type FactLedgerEntry, type PublicLedgerFact,
} from '@/lib/evidenceLadder';
import { getRecord, isUuid, parseEvidenceFamilyCard, parsePrivateCase, parseV3EvidenceApplications } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';
import { evidenceMoveSubmissionDigest, parseEvidenceMoveSubmission, verifyEvidenceMoveDetailed } from '@/lib/evidenceMoveVerification';
import { buildNodeBoardContext, NODE_OBSTACLES, type NodeObstacle } from '@/game/nodeObstacles';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import type { CaseTraitCategory } from '@/lib/caseTraits';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';
import type { EvidenceProgressResponse } from '@/types/expedition';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const submission = parseEvidenceMoveSubmission(await request.json().catch(() => null));
    if (!submission) return NextResponse.json({ error: 'Invalid evidence move submission' }, { status: 400 });
    const nodeOrder = submission.nodeIndex + 1;
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid AND node_order = ${nodeOrder} FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const publicCase = parsePublicCaseSnapshot(metadata.casePublic);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (publicCase?.version !== 4 || privateCase?.version !== 4) {
        return response(409, { error: 'Evidence-family progress requires a v4 run' });
      }
      const [node] = await tx.select().from(ecoRunNodes).where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nodeOrder))).limit(1);
      if (!node) return response(404, { error: 'Node not found' });
      if (session.runStatus !== 'active' || node.nodeStatus !== 'active' || session.nodeIndexCurrent !== nodeOrder) {
        return response(409, { reason: 'node_not_active' });
      }
      const boardContext = getRecord(node.boardContext);
      const state = parseV3NodeEvidenceState(boardContext);
      if (!state || state.selectedFamily) return response(409, { reason: 'invalid_node_state' });
      const duplicate = submission.moveNumber === node.movesUsed;
      const submissionDigest = evidenceMoveSubmissionDigest(submission);
      const ledger = parseFactLedger(metadata.factLedger);
      const applications = parseV3EvidenceApplications(metadata.evidenceApplications);
      let input: EvidenceProgressInput | null = null;
      let appliedState = state;
      let issues: ReturnType<typeof selectLadderIssues> = { issues: [], reinforcedFamilies: [] };
      if (duplicate) {
        if (state.lastSubmissionDigest !== submissionDigest) return response(409, { reason: 'move_locked' });
      } else {
        if (submission.moveNumber !== node.movesUsed + 1 || !Number.isInteger(node.boardSeed)) {
          return response(409, { reason: 'move_out_of_order' });
        }
        const obstacles = getNodeObstacles(node.hazardProfile);
        const verification = verifyEvidenceMoveDetailed(submission, {
          previousCheckpoint: state.boardCheckpoint,
          boardSeed: node.boardSeed!,
          selectedFamilies: state.selectedFamilies,
          obstacleSeeds: buildNodeBoardContext({
            width: GRID_COLS,
            height: GRID_ROWS,
            obstacles,
            nodeIndex: submission.nodeIndex,
          }).obstacleSeeds,
        });
        if (!verification.ok) {
          console.warn('[evidence-progress] Move replay rejected', {
            runId, nodeIndex: submission.nodeIndex, moveNumber: submission.moveNumber,
            move: submission.move, detail: verification.reason,
            boardSeed: node.boardSeed, gridDifference: verification.gridDifference,
          });
          const detail = process.env.NODE_ENV === 'development' && verification.gridDifference
            ? `${verification.reason} ${JSON.stringify({
              boardSeed: node.boardSeed,
              move: submission.move,
              moveNumber: submission.moveNumber,
              ...verification.gridDifference,
            })}`
            : verification.reason;
          return response(409, { reason: 'unverified_move', detail });
        }
        input = verification.input;
        issues = selectLadderIssues(input, state.hintCounts, privateCase.familyHintIds);
        const applied = applyEvidenceProgress(state, input, issues.issues.map(issue => issue.family));
        if ('error' in applied) return response(409, { reason: applied.error });
        appliedState = { ...applied.state, lastSubmissionDigest: submissionDigest };
      }
      const hintIds = duplicate ? appliedState.lastHintIds : issues.issues.map(issue => issue.hintId);
      const cascadeHintId = duplicate
        ? appliedState.lastCascadeHintId
        : input && shouldIssueCascadeHint(input)
          ? deriveCascadeHintId(state.cascadeHintCount, privateCase.cascadeHintIds) ?? undefined
          : undefined;
      const persistedState = { ...appliedState, lastHintIds: hintIds, ...(cascadeHintId ? { lastCascadeHintId: cascadeHintId } : {}) };

      // Hydrate the rungs this move reveals (or re-reveals on an idempotent retry).
      const moveEntries = duplicate
        ? ledger.filter(entry => entry.nodeIndex === submission.nodeIndex && entry.moveNumber === submission.moveNumber)
        : [];
      const familiesTouched = [...new Set((duplicate ? moveEntries.map(entry => entry.family) : issues.issues.map(issue => issue.family)))];
      const [hintRows, cascadeRows, cardRows, profileRows] = await Promise.all([
        privateCase.familyHints ? Promise.resolve(privateCase.familyHints.filter(hint => hintIds.includes(hint.id))) : hintIds.length ? tx.select({ id: evidenceFamilyHints.id, family: evidenceFamilyHints.family, hintText: evidenceFamilyHints.hintText, weakTag: evidenceFamilyHints.weakTag })
          .from(evidenceFamilyHints).where(inArray(evidenceFamilyHints.id, hintIds)) : Promise.resolve([]),
        cascadeHintId ? tx.select({ id: cascadeHints.id, hintText: cascadeHints.hintText })
          .from(cascadeHints).where(eq(cascadeHints.id, cascadeHintId)).limit(1) : Promise.resolve([]),
        !privateCase.familyHints && familiesTouched.length ? tx.select().from(evidenceFamilyCards)
          .where(inArray(evidenceFamilyCards.id, familiesTouched.map(family => privateCase.familyCardIds[family]))) : Promise.resolve([]),
        familiesTouched.length && !duplicate ? tx.select().from(speciesDeductionProfiles)
          .where(inArray(speciesDeductionProfiles.speciesId, publicCase.candidateIds)) : Promise.resolve([]),
      ]);
      if (hintRows.length !== new Set(hintIds).size || (cascadeHintId && cascadeRows.length !== 1)) {
        throw new Error('Compiled hint corpus changed during active run');
      }
      const hintById = new Map(hintRows.map(row => [row.id, row]));
      const cardByFamily = new Map<EvidenceFamily, { traitCategory: CaseTraitCategory }>();
      for (const hint of privateCase.familyHints ?? []) cardByFamily.set(hint.family, hint);
      for (const row of cardRows) {
        const card = parseEvidenceFamilyCard(row);
        if (card) cardByFamily.set(card.family, card);
      }
      if (familiesTouched.some(family => !cardByFamily.has(family))) throw new Error('Compiled card corpus changed during active run');

      let newEntries: FactLedgerEntry[] = [];
      if (!duplicate && issues.issues.length > 0) {
        if (profileRows.length !== publicCase.candidateIds.length) return response(409, { reason: 'corpus_invariant_failed' });
        const eliminated = new Set([
          ...applications.flatMap(application => application.actualEliminatedIds),
          ...ledgerEliminatedIds(ledger),
        ]);
        const issuedAt = new Date().toISOString();
        for (const issue of issues.issues) {
          const hint = hintById.get(issue.hintId);
          const card = cardByFamily.get(issue.family);
          if (!hint || !card) throw new Error('Compiled hint corpus changed during active run');
          const actualEliminatedIds = computeLadderEliminatedIds(profileRows, eliminated, card.traitCategory, hint.weakTag);
          // Compiler guarantees rung tags sit in the answer profile; refuse rather than mis-eliminate.
          if (actualEliminatedIds.includes(privateCase.answerId)) return response(409, { reason: 'corpus_invariant_failed' });
          for (const id of actualEliminatedIds) eliminated.add(id);
          newEntries.push({
            nodeIndex: submission.nodeIndex, moveNumber: submission.moveNumber, family: issue.family,
            hintId: issue.hintId, rung: issue.rung, actualEliminatedIds, issuedAt,
          });
        }
      }
      const revealed = duplicate ? moveEntries : newEntries;
      const facts: PublicLedgerFact[] = revealed.flatMap(entry => {
        const hint = hintById.get(entry.hintId);
        const card = cardByFamily.get(entry.family);
        return hint && card ? [withExplanationNote(hydrateLedgerFact(entry, hint, card, privateCase.familyHintIds[entry.family].length), metadata)] : [];
      });

      const hypotheses = hypothesesFromMetadata({ ...metadata, factLedger: [...ledger, ...newEntries] });
      if (!duplicate) {
        await tx.update(ecoRunNodes).set({
          movesUsed: submission.moveNumber,
          objectiveProgress: submission.moveNumber,
          boardContext: { ...boardContext, ...persistedState },
          updatedAt: new Date(),
        }).where(eq(ecoRunNodes.id, node.id));
        if (newEntries.length > 0) {
          await tx.update(ecoRunSessions).set({
            metadata: { ...metadata, factLedger: [...ledger, ...newEntries] },
          }).where(eq(ecoRunSessions.id, runId));
        }
      }
      const orderedHints = hintIds.flatMap(id => {
        const hint = hintById.get(id);
        return hint ? [hint] : [];
      });
      return response(200, {
        ok: true,
        duplicate,
        nodeIndex: submission.nodeIndex,
        segmentMovesUsed: appliedState.segmentMovesUsed,
        evidenceCharges: persistedState.evidenceCharges,
        offeredFamilies: persistedState.offeredFamilies,
        hintLines: orderedHints.map(hint => hint.hintText),
        hintFamilies: orderedHints.map(hint => hint.family),
        cascadeHintLine: cascadeRows[0]?.hintText ?? null,
        facts,
        hypotheses,
        reinforcedFamilies: duplicate ? [] : issues.reinforcedFamilies,
      } satisfies EvidenceProgressResponse);
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/evidence-progress] Error:', error);
    return NextResponse.json({ error: 'Failed to save evidence progress' }, { status: 500 });
  }
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }

function getNodeObstacles(value: unknown): NodeObstacle[] {
  const source = getRecord(value);
  return Array.isArray(source.obstacles)
    ? source.obstacles.filter((item): item is NodeObstacle => typeof item === 'string' && NODE_OBSTACLES.includes(item as NodeObstacle))
    : [];
}
