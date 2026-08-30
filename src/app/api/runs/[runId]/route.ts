import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, runMemories } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getRecord, hydrateFamilyObservation, isUuid, parseEvidenceFamilyCard, parsePrivateCase, parseV3EvidenceApplications, resolveFieldFacts } from '@/lib/runCaseState';
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
    const metadata = getRecord(session.metadata);
    const evidence = await hydrateEvidence(metadata.evidenceApplications);
    const privateCase = parsePrivateCase(metadata.casePrivate);
    const verdict = session.runStatus === 'completed' && privateCase ? {
      resolvedSpeciesId: privateCase.answerId,
      resolvedExplanationId: privateCase.mystery.answerExplanationId,
      fieldFacts: evidence.fieldFacts,
      resolution: privateCase.mystery.resolution,
    } : null;
    return NextResponse.json(projectRunForClient(session, {
      nodes,
      memory: memories[0] ?? null,
      publicObservations: evidence.observations,
      verdict,
    }));
  } catch (error) {
    console.error('[API GET /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}

async function hydrateEvidence(value: unknown) {
  const applications = parseV3EvidenceApplications(value);
  const cards = applications.length === 0 ? [] : await db.select().from(evidenceFamilyCards)
    .where(inArray(evidenceFamilyCards.id, applications.map(item => item.cardId)));
  const parsedCards = cards.flatMap(value => {
    const card = parseEvidenceFamilyCard(value);
    return card ? [card] : [];
  });
  const observations = applications.flatMap(application => {
    const card = parseEvidenceFamilyCard(cards.find(value => value.id === application.cardId));
    return card ? [hydrateFamilyObservation(card, application)] : [];
  });
  return { observations, fieldFacts: resolveFieldFacts(applications, parsedCards) };
}
