import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, evidenceFamilyHints, runMemories } from '@/db';
import { hydrateLedgerFact, parseFactLedger, type PublicLedgerFact } from '@/lib/evidenceLadder';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getRecord, hydrateFamilyObservation, isUuid, parseEvidenceFamilyCard, parsePrivateCase, parseV3EvidenceApplications, resolveFieldFacts } from '@/lib/runCaseState';
import { projectRunForClient } from '@/lib/runProjection';
import { StoredTerrainError } from '@/terrain/terrain';

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
    const privateCase = parsePrivateCase(metadata.casePrivate);
    const [evidence, publicFacts] = await Promise.all([
      hydrateEvidence(metadata.evidenceApplications),
      hydrateLedger(metadata.factLedger, privateCase),
    ]);
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
      publicFacts,
      verdict,
    }));
  } catch (error) {
    if (error instanceof StoredTerrainError) return NextResponse.json({ error: error.message }, { status: 500 });
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

/** Resume path: rebuild revealed ladder facts from reviewed hint text; ids and tags stay server-side. */
async function hydrateLedger(value: unknown, privateCase: ReturnType<typeof parsePrivateCase>): Promise<PublicLedgerFact[]> {
  const ledger = parseFactLedger(value);
  if (ledger.length === 0 || !privateCase) return [];
  if (privateCase.familyHints) {
    const byId = new Map(privateCase.familyHints.map(hint => [hint.id, hint]));
    return ledger.map(entry => {
      const hint = byId.get(entry.hintId);
      if (!hint || hint.family !== entry.family) throw new Error('Saved ledger hint missing from run snapshot');
      return hydrateLedgerFact(entry, hint, hint, privateCase.familyHintIds[entry.family].length);
    });
  }
  const families = [...new Set(ledger.map(entry => entry.family))];
  const [hints, cards] = await Promise.all([
    db.select({ id: evidenceFamilyHints.id, hintText: evidenceFamilyHints.hintText }).from(evidenceFamilyHints)
      .where(inArray(evidenceFamilyHints.id, ledger.map(entry => entry.hintId))),
    db.select().from(evidenceFamilyCards).where(inArray(evidenceFamilyCards.id, families.map(family => privateCase.familyCardIds[family]))),
  ]);
  const hintById = new Map(hints.map(row => [row.id, row]));
  const cardByFamily = new Map(cards.flatMap(row => { const card = parseEvidenceFamilyCard(row); return card ? [[card.family, card] as const] : []; }));
  return ledger.flatMap(entry => {
    const hint = hintById.get(entry.hintId);
    const card = cardByFamily.get(entry.family);
    return hint && card ? [hydrateLedgerFact(entry, hint, card, privateCase.familyHintIds[entry.family].length)] : [];
  });
}
