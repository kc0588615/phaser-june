import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { cascadeHints, db, ecoRunNodes, ecoRunSessions, evidenceFamilyHints } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { applyEvidenceProgress, deriveCascadeHintId, deriveEvidenceHintIds, getEvidenceHintFamilies, parseV3NodeEvidenceState, shouldIssueCascadeHint, type EvidenceProgressInput } from '@/lib/evidenceRunState';
import { getRecord, isUuid, parsePrivateCase } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';
import { evidenceMoveSubmissionDigest, parseEvidenceMoveSubmission, verifyEvidenceMoveDetailed } from '@/lib/evidenceMoveVerification';
import { buildNodeBoardContext, NODE_OBSTACLES, type NodeObstacle } from '@/game/nodeObstacles';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';

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
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (parsePublicCaseSnapshot(metadata.casePublic)?.version !== 4 || privateCase?.version !== 4) {
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
      let input: EvidenceProgressInput | null = null;
      let appliedState = state;
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
          });
          return response(409, { reason: 'unverified_move', detail: verification.reason });
        }
        input = verification.input;
        const applied = applyEvidenceProgress(state, input);
        if ('error' in applied) return response(409, { reason: applied.error });
        appliedState = { ...applied.state, lastSubmissionDigest: submissionDigest };
      }
      const hintFamilies = input ? getEvidenceHintFamilies(input) : [];
      const hintIds = duplicate ? appliedState.lastHintIds : deriveEvidenceHintIds(state.hintCounts, hintFamilies, privateCase.familyHintIds);
      const cascadeHintId = duplicate
        ? appliedState.lastCascadeHintId
        : input && shouldIssueCascadeHint(input)
          ? deriveCascadeHintId(state.cascadeHintCount, privateCase.cascadeHintIds) ?? undefined
          : undefined;
      const persistedState = { ...appliedState, lastHintIds: hintIds, ...(cascadeHintId ? { lastCascadeHintId: cascadeHintId } : {}) };
      if (!duplicate) {
        await tx.update(ecoRunNodes).set({
          movesUsed: submission.moveNumber,
          objectiveProgress: submission.moveNumber,
          boardContext: { ...boardContext, ...persistedState },
          updatedAt: new Date(),
        }).where(eq(ecoRunNodes.id, node.id));
      }
      const [hintRows, cascadeRows] = await Promise.all([
        hintIds.length ? tx.select({ id: evidenceFamilyHints.id, family: evidenceFamilyHints.family, hintText: evidenceFamilyHints.hintText })
          .from(evidenceFamilyHints).where(inArray(evidenceFamilyHints.id, hintIds)) : Promise.resolve([]),
        cascadeHintId ? tx.select({ id: cascadeHints.id, hintText: cascadeHints.hintText })
          .from(cascadeHints).where(eq(cascadeHints.id, cascadeHintId)).limit(1) : Promise.resolve([]),
      ]);
      if (hintRows.length !== new Set(hintIds).size || (cascadeHintId && cascadeRows.length !== 1)) {
        throw new Error('Compiled hint corpus changed during active run');
      }
      const hintById = new Map(hintRows.map(row => [row.id, row]));
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
        hintLine: orderedHints.at(-1)?.hintText ?? null,
        hintLines: orderedHints.map(hint => hint.hintText),
        hintFamilies: orderedHints.map(hint => hint.family),
        cascadeHintLine: cascadeRows[0]?.hintText ?? null,
      });
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
