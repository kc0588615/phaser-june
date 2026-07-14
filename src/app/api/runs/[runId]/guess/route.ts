import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoLocationMastery, ecoRunNodes, ecoRunSessions, evidenceCards, playerSpeciesDiscoveries, runMemories, speciesCards, speciesCardUnlocks, speciesDeductionProfiles, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { compareReference, type DeductionProfile } from '@/lib/deductionEngine';
import { sampleGisFeaturesForRoute } from '@/lib/gisFeatureSampling';
import { decideGuess, getRecord, isUuid, parseEvidenceCard, parseIssuedObservations, parsePrivateCase } from '@/lib/runCaseState';
import { buildLocationMasteryMetadata, buildRunMemoryArtifacts, getExpeditionRegionKeys, getRunAffinityTags, getRunGisStamps, resolveCompletedRunRoute } from '@/lib/runCompletion';
import { getSpeciesCardRarityTier } from '@/lib/speciesCardProgression';
import { refreshSpeciesCardProgress } from '@/lib/speciesCardProgression.server';
import { getGuessBonuses } from '@/types/expedition';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    const speciesId = getRecord(await request.json().catch(() => ({}))).speciesId;
    if (!Number.isInteger(speciesId) || (speciesId as number) <= 0) return NextResponse.json({ error: 'Invalid speciesId' }, { status: 400 });

    let completionArtifacts: ReturnType<typeof buildRunMemoryArtifacts> | null = null;
    if (playerId) {
      const [preSession] = await db.select().from(ecoRunSessions)
        .where(and(eq(ecoRunSessions.id, runId), eq(ecoRunSessions.playerId, playerId))).limit(1);
      const prePrivateCase = parsePrivateCase(getRecord(preSession?.metadata).casePrivate);
      if (preSession?.runStatus === 'deduction' && prePrivateCase?.answerId === speciesId) {
        const preNodes = await db.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
        const route = resolveCompletedRunRoute(
          preSession.selectedLng,
          preSession.selectedLat,
          preNodes,
          getRecord(preSession.metadata).routePolyline,
        );
        try {
          const fingerprints = await sampleGisFeaturesForRoute(route);
          completionArtifacts = buildRunMemoryArtifacts(route, fingerprints);
        } catch (error) {
          console.error('[API POST /api/runs/[runId]/guess] Route GIS sampling failed:', error);
          return NextResponse.json({ error: 'Could not finalize expedition GIS memory' }, { status: 503 });
        }
      }
    }

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (!playerId) return response(401, { error: 'Unauthorized' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      const publicCase = getRecord(metadata.casePublic);
      const candidateIds = Array.isArray(publicCase.candidateIds) ? publicCase.candidateIds.filter((id): id is number => Number.isInteger(id)) : [];
      if (!privateCase || candidateIds.length !== 6) return response(409, { reason: 'legacy_run' });
      const decision = decideGuess(session.runStatus, speciesId as number, privateCase.answerId);
      if (decision === 'not_ready') return response(409, { reason: 'not_guess_ready' });
      if (decision === 'terminal_conflict') return response(409, { reason: 'run_completed' });
      if (!candidateIds.includes(speciesId as number)) return response(400, { error: 'speciesId is not a case candidate' });
      const issued = parseIssuedObservations(metadata.observationsIssued);
      const committed = new Set((Array.isArray(metadata.reasoningEvents) ? metadata.reasoningEvents : []).flatMap(value => {
        const ref = getRecord(value).obsRef;
        return typeof ref === 'string' ? [ref] : [];
      }));
      if (issued.some(item => !committed.has(item.ref))) return response(409, { reason: 'uncommitted_interpretation' });

      const wrongGuessCount = Number.isSafeInteger(metadata.wrongGuessCount) && (metadata.wrongGuessCount as number) >= 0
        ? metadata.wrongGuessCount as number : 0;
      if (decision === 'wrong') {
        const feedback = await buildFeedback(tx, privateCase.answerId, speciesId as number, issued);
        const guessMetrics = { wrongGuessCount: wrongGuessCount + 1, ...(metadata.firstGuessCorrect === undefined ? { firstGuessCorrect: false } : {}) };
        await tx.update(ecoRunSessions).set({ metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify(guessMetrics)}::jsonb` }).where(eq(ecoRunSessions.id, runId));
        await tx.update(ecoRunNodes).set({ guessedSpeciesId: speciesId as number, guessCorrect: false, updatedAt: new Date() })
          .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, session.nodeCountPlanned)));
        return response(200, { correct: false, selectedSpeciesId: speciesId, contrastiveFeedback: feedback });
      }

      const existingFinalScore = typeof metadata.finalScore === 'number' ? metadata.finalScore : session.scoreTotal;
      if (decision === 'repeat_correct') return response(200, { correct: true, selectedSpeciesId: speciesId, contrastiveFeedback: [], finalScore: existingFinalScore });
      const baseBonuses = getGuessBonuses(issued.length, true);
      const { guessBonus, efficiencyBonus, bonusDecayPercent } = applyWrongGuessDecay(baseBonuses, wrongGuessCount);
      const finalScore = session.scoreTotal + guessBonus + efficiencyBonus;
      const now = new Date();
      const firstGuessCorrect = metadata.firstGuessCorrect === undefined ? true : metadata.firstGuessCorrect === true;
      const deductionSummary = { issuedEvidenceCount: issued.length, reasoningEventCount: committed.size, guessBonus, efficiencyBonus, bonusDecayPercent, wrongGuessCount, firstGuessCorrect };
      if (!completionArtifacts) return response(503, { error: 'Could not resolve expedition completion artifacts' });
      await tx.update(ecoRunSessions).set({
        runStatus: 'completed', endedAt: now, scoreTotal: finalScore,
        speciesDiscoveredCount: sql`${ecoRunSessions.speciesDiscoveredCount} + 1`,
        metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ finalScore, deductionSummary, wrongGuessCount, firstGuessCorrect, awardsApplied: true })}::jsonb`,
      }).where(eq(ecoRunSessions.id, runId));
      await tx.update(ecoRunNodes).set({ guessedSpeciesId: speciesId as number, guessCorrect: true, updatedAt: now })
        .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, session.nodeCountPlanned)));

      const nodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
      await tx.insert(runMemories).values({
        runId, playerId: session.playerId, speciesId: privateCase.answerId, locationKey: session.locationKey,
        startLon: session.selectedLng, startLat: session.selectedLat,
        routePolyline: completionArtifacts.routePolyline,
        routeBounds: completionArtifacts.routeBounds,
        nodes: nodes.map(node => ({ nodeOrder: node.nodeOrder, nodeType: node.nodeType, nodeStatus: node.nodeStatus, objectiveTarget: node.objectiveTarget, objectiveProgress: node.objectiveProgress, scoreEarned: node.scoreEarned, movesUsed: node.movesUsed })),
        gisFeaturesNearby: completionArtifacts.gisFeaturesNearby,
        deductionSummary, finalScore, realm: session.realm, biome: session.biome, bioregion: session.bioregion,
      }).onConflictDoUpdate({
        target: runMemories.runId,
        set: {
          speciesId: privateCase.answerId,
          routePolyline: completionArtifacts.routePolyline,
          routeBounds: completionArtifacts.routeBounds,
          nodes: nodes.map(node => ({ nodeOrder: node.nodeOrder, nodeType: node.nodeType, nodeStatus: node.nodeStatus, objectiveTarget: node.objectiveTarget, objectiveProgress: node.objectiveProgress, scoreEarned: node.scoreEarned, movesUsed: node.movesUsed })),
          gisFeaturesNearby: completionArtifacts.gisFeaturesNearby,
          deductionSummary,
          finalScore,
        },
      });

      if (session.playerId) {
        await awardDiscovery(tx, session.playerId, privateCase.answerId, session.gameSessionId, runId, finalScore, issued.length, wrongGuessCount, now);

        const [existingMastery] = await tx.select({ metadata: ecoLocationMastery.metadata })
          .from(ecoLocationMastery)
          .where(and(eq(ecoLocationMastery.playerId, session.playerId), eq(ecoLocationMastery.locationKey, session.locationKey)))
          .limit(1);
        const masteryMetadata = buildLocationMasteryMetadata(
          existingMastery?.metadata,
          completionArtifacts.gisFeaturesNearby,
          { runId, finalScore, completedAt: now },
        );
        await tx.insert(ecoLocationMastery).values({
          playerId: session.playerId,
          locationKey: session.locationKey,
          realm: session.realm,
          biome: session.biome,
          bioregion: session.bioregion,
          runsCompleted: 1,
          bestRunScore: finalScore,
          lastPlayedAt: now,
          metadata: masteryMetadata,
        }).onConflictDoUpdate({
          target: [ecoLocationMastery.playerId, ecoLocationMastery.locationKey],
          set: {
            realm: session.realm,
            biome: session.biome,
            bioregion: session.bioregion,
            runsCompleted: sql`${ecoLocationMastery.runsCompleted} + 1`,
            bestRunScore: sql`GREATEST(${ecoLocationMastery.bestRunScore}, ${finalScore})`,
            lastPlayedAt: now,
            metadata: sql`COALESCE(${ecoLocationMastery.metadata}, '{}'::jsonb) || ${JSON.stringify(masteryMetadata)}::jsonb`,
          },
        });

        const stamps = getRunGisStamps(completionArtifacts.gisFeaturesNearby);
        const regionsSeen = getExpeditionRegionKeys({ realm: session.realm, biome: session.biome, bioregion: session.bioregion });
        const affinityTags = getRunAffinityTags(metadata);
        await tx.update(speciesCards).set({
          ...(stamps.length > 0 ? {
            gisStamps: sql`(
              SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(${speciesCards.gisStamps}, '[]'::jsonb) || ${JSON.stringify(stamps)}::jsonb) AS val
            )`,
          } : {}),
          ...(regionsSeen.length > 0 ? {
            expeditionRegionsSeen: sql`(
              SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(${speciesCards.expeditionRegionsSeen}, '[]'::jsonb) || ${JSON.stringify(regionsSeen)}::jsonb) AS val
            )`,
          } : {}),
          ...(affinityTags.length > 0 ? {
            affinityTags: sql`(
              SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(${speciesCards.affinityTags}, '[]'::jsonb) || ${JSON.stringify(affinityTags)}::jsonb) AS val
            )`,
          } : {}),
          updatedAt: now,
        }).where(and(eq(speciesCards.playerId, session.playerId), eq(speciesCards.speciesId, privateCase.answerId)));
      }
      return response(200, { correct: true, selectedSpeciesId: speciesId, contrastiveFeedback: [], finalScore });
    });
    if (result.body.correct === true && playerId) {
      try {
        await refreshSpeciesCardProgress(playerId, speciesId as number);
      } catch (error) {
        console.error('[API POST /api/runs/[runId]/guess] Card progress refresh failed:', error);
      }
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/guess] Error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

type RunTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function buildFeedback(tx: RunTransaction, answerId: number, guessedId: number, issued: ReturnType<typeof parseIssuedObservations>) {
  const profiles = await tx.select({
    speciesId: speciesDeductionProfiles.speciesId, commonName: speciesTable.commonName, scientificName: speciesTable.scientificName,
    habitatTags: speciesDeductionProfiles.habitatTags, morphologyTags: speciesDeductionProfiles.morphologyTags,
    dietTags: speciesDeductionProfiles.dietTags, behaviorTags: speciesDeductionProfiles.behaviorTags,
    reproductionTags: speciesDeductionProfiles.reproductionTags, taxonomyTags: speciesDeductionProfiles.taxonomyTags,
    geographyTags: speciesDeductionProfiles.geographyTags, conservationTags: speciesDeductionProfiles.conservationTags,
    keyFactTags: speciesDeductionProfiles.keyFactTags, signatureTag: speciesDeductionProfiles.signatureTag,
  }).from(speciesDeductionProfiles).innerJoin(speciesTable, eq(speciesTable.id, speciesDeductionProfiles.speciesId))
    .where(inArray(speciesDeductionProfiles.speciesId, [answerId, guessedId]));
  const answer = profiles.find((profile: DeductionProfile) => profile.speciesId === answerId);
  const guessed = profiles.find((profile: DeductionProfile) => profile.speciesId === guessedId);
  if (!answer || !guessed) return [];
  const cards = issued.length ? await tx.select().from(evidenceCards).where(inArray(evidenceCards.id, issued.map(item => item.cardId))) : [];
  return issued.flatMap(item => {
    const card = parseEvidenceCard(cards.find((value: { id: number }) => value.id === item.cardId));
    return card ? [{ obsRef: item.ref, ...compareReference(answer, guessed, card.traitCategory, [card.compareTag]) }] : [];
  });
}

async function awardDiscovery(tx: RunTransaction, playerId: string, speciesId: number, sessionId: string | null, runId: string, finalScore: number, issuedCount: number, wrongGuessCount: number, now: Date) {
  const [species] = await tx.select({ conservationCode: speciesTable.conservationCode }).from(speciesTable).where(eq(speciesTable.id, speciesId)).limit(1);
  await tx.insert(playerSpeciesDiscoveries).values({ playerId, speciesId, sessionId, runId, cluesUnlockedBeforeGuess: issuedCount, incorrectGuessesCount: wrongGuessCount, scoreEarned: finalScore })
    .onConflictDoNothing({ target: [playerSpeciesDiscoveries.playerId, playerSpeciesDiscoveries.speciesId] });
  await tx.insert(speciesCards).values({
    playerId, speciesId, discovered: true, firstDiscoveredAt: now, lastEncounteredAt: now, timesEncountered: 1,
    bestRunId: runId, bestRunScore: finalScore, conservationCode: species?.conservationCode ?? null,
    rarityTier: getSpeciesCardRarityTier(species?.conservationCode),
  }).onConflictDoUpdate({ target: [speciesCards.playerId, speciesCards.speciesId], set: {
    discovered: true, firstDiscoveredAt: sql`COALESCE(${speciesCards.firstDiscoveredAt}, ${now})`, lastEncounteredAt: now,
    timesEncountered: sql`${speciesCards.timesEncountered} + 1`, bestRunId: sql`CASE WHEN COALESCE(${speciesCards.bestRunScore}, 0) < ${finalScore} THEN ${runId}::uuid ELSE ${speciesCards.bestRunId} END`,
    bestRunScore: sql`GREATEST(COALESCE(${speciesCards.bestRunScore}, 0), ${finalScore})`, updatedAt: now,
  } });
  await tx.insert(speciesCardUnlocks).values({ playerId, speciesId, runId, unlockType: 'discover', payload: {} });
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }

function applyWrongGuessDecay(
  bonuses: { guessBonus: number; efficiencyBonus: number },
  wrongGuessCount: number,
) {
  const remainingQuarters = Math.max(0, 4 - Math.min(wrongGuessCount, 4));
  return {
    guessBonus: Math.round(bonuses.guessBonus * remainingQuarters / 4),
    efficiencyBonus: Math.round(bonuses.efficiencyBonus * remainingQuarters / 4),
    bonusDecayPercent: (4 - remainingQuarters) * 25,
  };
}
