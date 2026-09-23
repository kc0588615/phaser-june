import { claimsFromMetadata, decideClaim, hypothesesFromMetadata, revealedExplanationFeedback, type ClaimInput } from '@/lib/liveClaims';
import { ledgerEliminatedIds, parseFactLedger } from '@/lib/evidenceLadder';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoLocationMastery, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, playerSpeciesDiscoveries, runMemories, speciesCards, speciesCardUnlocks, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { sampleGisFeaturesForRoute } from '@/lib/gisFeatureSampling';
import { getRecord, isUuid, parseEvidenceFamilyCard, parsePrivateCase, parseV3EvidenceApplications, resolveFieldFacts } from '@/lib/runCaseState';
import { buildLocationMasteryMetadata, buildRunMemoryArtifacts, getExpeditionRegionKeys, getRunAffinityTags, getRunGisStamps, resolveCompletedRunRoute } from '@/lib/runCompletion';
import { getSpeciesCardRarityTier } from '@/lib/speciesCardProgression';
import { refreshSpeciesCardProgress } from '@/lib/speciesCardProgression.server';
import { getGuessBonuses } from '@/types/expedition';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = getRecord(await request.json().catch(() => ({})));
    if (!isUuid(body.requestId)) return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 });
    const requestId = body.requestId;
    let input: ClaimInput;
    if (body.claim === 'species' && Number.isSafeInteger(body.speciesId) && Number(body.speciesId) > 0) input = { claim: 'species', speciesId: Number(body.speciesId) };
    else if (body.claim === 'explanation' && typeof body.explanationId === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.explanationId) && body.explanationId.length <= 80) input = { claim: 'explanation', explanationId: body.explanationId };
    else return NextResponse.json({ error: 'Invalid claim' }, { status: 400 });
    const fingerprint = JSON.stringify(input);

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
      const receipts = getRecord(metadata.claimReceipts);
      const receipt = getRecord(receipts[requestId]);
      if (receipt.fingerprint !== undefined) {
        if (receipt.fingerprint !== fingerprint) return response(409, { reason: 'request_conflict' });
        const terminal = session.runStatus === 'completed';
        const slipped = terminal && metadata.completionReason === 'slipped';
        return response(200, { ...getRecord(receipt.response), claims: claimsFromMetadata(metadata),
          hypotheses: hypothesesFromMetadata(metadata), explanationFeedback: revealedExplanationFeedback(metadata), duplicate: true,
          ...(terminal ? { resolved: !slipped, slipped, finalScore: metadata.finalScore ?? session.scoreTotal,
            completionReason: slipped ? 'slipped' : 'captured',
            ...(!slipped ? { resolvedSpeciesId: privateCase.answerId, resolvedExplanationId: privateCase.mystery.answerExplanationId,
              resolution: privateCase.mystery.resolution, fieldFacts: await loadFieldFacts(tx, parseV3EvidenceApplications(metadata.evidenceApplications)) } : {}),
          } : {}),
        });
      }
      if (!['active', 'deduction'].includes(session.runStatus)) return response(409, { reason: 'run_completed' });
      const v3Applications = parseV3EvidenceApplications(metadata.evidenceApplications);
      const eliminatedIds = [...new Set([...v3Applications.flatMap(a => a.actualEliminatedIds), ...ledgerEliminatedIds(parseFactLedger(metadata.factLedger))])];
      const hypotheses = hypothesesFromMetadata(metadata);
      const decision = decideClaim(claimsFromMetadata(metadata), input, privateCase.answerId,
        privateCase.mystery.answerExplanationId, candidateIds, eliminatedIds, hypotheses);
      if ('error' in decision) return response(409, { reason: decision.error });
      const wrongGuessCount = decision.claims.wrongClaims;
      const explanationFeedback = { ...revealedExplanationFeedback(metadata),
        ...(input.claim === 'explanation' ? { [input.explanationId]: privateCase.mystery.explanationFeedback[input.explanationId] } : {}),
      };
      const claimResponse: Record<string, unknown> = {
        claims: decision.claims, hypotheses, explanationFeedback, verdict: decision.verdict,
        resolved: decision.resolved, slipped: decision.slipped,
      };
      const updatedMetadata = () => ({ ...metadata, claims: decision.claims, explanationFeedback,
        wrongGuessCount, firstGuessCorrect: wrongGuessCount === 0,
        claimReceipts: { ...receipts, [requestId]: { fingerprint, response: claimResponse } },
      });
      if (!decision.resolved && !decision.slipped) {
        await tx.update(ecoRunSessions).set({ metadata: updatedMetadata() }).where(eq(ecoRunSessions.id, runId));
        return response(200, claimResponse);
      }
      const nodesBefore = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
      const visited = nodesBefore.filter(node => node.nodeStatus === 'completed' || node.nodeOrder === session.nodeIndexCurrent);
      const route = resolveCompletedRunRoute(session.selectedLng, session.selectedLat,
        visited.map(node => ({ ...node, nodeStatus: 'completed' })), [], false);
      const speciesId = privateCase.answerId;
      const explanationId = privateCase.mystery.answerExplanationId;
      if (decision.slipped) {
        const finalScore = session.scoreTotal;
        Object.assign(claimResponse, { finalScore, completionReason: 'slipped' });
        const deductionSummary = { slipped: true, wrongGuessCount, guessBonus: 0, efficiencyBonus: 0 };
        await tx.update(ecoRunSessions).set({ runStatus: 'completed', endedAt: new Date(),
          metadata: { ...updatedMetadata(), finalScore, completionReason: 'slipped', deductionSummary, awardsApplied: false },
        }).where(eq(ecoRunSessions.id, runId));
        await tx.update(ecoRunNodes).set({ nodeStatus: 'skipped', updatedAt: new Date() })
          .where(and(eq(ecoRunNodes.runId, runId), inArray(ecoRunNodes.nodeStatus, ['locked', 'active', 'failed'])));
        await tx.insert(runMemories).values({ runId, playerId, locationKey: session.locationKey,
          startLon: session.selectedLng, startLat: session.selectedLat, routePolyline: route,
          nodes: nodesBefore.map(n => ({ nodeOrder: n.nodeOrder, nodeStatus: n.nodeStatus === 'completed' ? 'completed' : 'skipped', movesUsed: n.movesUsed })),
          deductionSummary, finalScore,
        }).onConflictDoNothing({ target: runMemories.runId });
        return response(200, claimResponse);
      }
      let completionArtifacts: ReturnType<typeof buildRunMemoryArtifacts>;
      try { completionArtifacts = buildRunMemoryArtifacts(route, await sampleGisFeaturesForRoute(route)); }
      catch (error) { console.error('[claims] GIS completion failed', error); return response(503, { error: 'Could not finalize expedition memory; retry claim' }); }
      const fieldFacts = await loadFieldFacts(tx, v3Applications);
      if (fieldFacts.length !== v3Applications.length) return response(503, { error: 'Verdict facts unavailable' });

      const evidenceCount = v3Applications.length;
      const baseBonuses = getGuessBonuses(nodesBefore.filter(node => node.nodeStatus === 'completed').length, true);
      const { guessBonus, efficiencyBonus, bonusDecayPercent } = applyWrongGuessDecay(baseBonuses, wrongGuessCount);
      const finalScore = session.scoreTotal + guessBonus + efficiencyBonus;
      const now = new Date();
      const firstGuessCorrect = wrongGuessCount === 0;
      const deductionSummary = { issuedEvidenceCount: evidenceCount, guessBonus, efficiencyBonus, bonusDecayPercent, wrongGuessCount, firstGuessCorrect };
      Object.assign(claimResponse, { finalScore, completionReason: 'captured', resolvedSpeciesId: speciesId,
        resolvedExplanationId: explanationId, fieldFacts, resolution: privateCase.mystery.resolution });
      await tx.update(ecoRunSessions).set({
        runStatus: 'completed', endedAt: now, scoreTotal: finalScore,
        speciesDiscoveredCount: sql`${ecoRunSessions.speciesDiscoveredCount} + 1`,
        metadata: { ...updatedMetadata(), finalScore, deductionSummary, completionReason: 'captured', awardsApplied: true, resolvedExplanationId: explanationId },
      }).where(eq(ecoRunSessions.id, runId));
      await tx.update(ecoRunNodes).set({ guessedSpeciesId: speciesId as number, guessCorrect: true, updatedAt: now })
        .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, session.nodeIndexCurrent)));

      await tx.update(ecoRunNodes).set({ nodeStatus: 'skipped', updatedAt: now })
        .where(and(eq(ecoRunNodes.runId, runId), inArray(ecoRunNodes.nodeStatus, ['locked', 'active', 'failed'])));
      const nodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
      const memoryNodes = nodes.map(node => ({
        nodeOrder: node.nodeOrder,
        nodeType: node.nodeType,
        nodeStatus: node.nodeStatus,
        objectiveTarget: node.objectiveTarget,
        objectiveProgress: node.objectiveProgress,
        scoreEarned: node.scoreEarned,
        movesUsed: node.movesUsed,
        obstacleFamily: getRecord(node.hazardProfile).obstacleFamily ?? null,
        waypoint: getRecord(node.boardContext).waypoint ?? null,
      }));
      await tx.insert(runMemories).values({
        runId, playerId: session.playerId, speciesId: privateCase.answerId, locationKey: session.locationKey,
        startLon: session.selectedLng, startLat: session.selectedLat,
        routePolyline: completionArtifacts.routePolyline,
        routeBounds: completionArtifacts.routeBounds,
        nodes: memoryNodes,
        gisFeaturesNearby: completionArtifacts.gisFeaturesNearby,
        deductionSummary, finalScore, realm: session.realm, biome: session.biome, bioregion: session.bioregion,
      }).onConflictDoUpdate({
        target: runMemories.runId,
        set: {
          speciesId: privateCase.answerId,
          routePolyline: completionArtifacts.routePolyline,
          routeBounds: completionArtifacts.routeBounds,
          nodes: memoryNodes,
          gisFeaturesNearby: completionArtifacts.gisFeaturesNearby,
          deductionSummary,
          finalScore,
        },
      });

      if (session.playerId) {
        await awardDiscovery(tx, session.playerId, privateCase.answerId, session.gameSessionId, runId, finalScore, wrongGuessCount, now);
        {
          const unlockedFacts = fieldFacts.map(fact => fact.text);
          if (unlockedFacts.length > 0) {
            await tx.update(speciesCards).set({
              factsUnlocked: sql`(
                SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
                FROM jsonb_array_elements(COALESCE(${speciesCards.factsUnlocked}, '[]'::jsonb) || ${JSON.stringify(unlockedFacts)}::jsonb) AS val
              )`,
              updatedAt: now,
            }).where(and(eq(speciesCards.playerId, session.playerId), eq(speciesCards.speciesId, privateCase.answerId)));
            await tx.insert(speciesCardUnlocks).values({
              playerId: session.playerId, speciesId: privateCase.answerId, runId,
              unlockType: 'fact', payload: { facts: unlockedFacts, families: v3Applications.map(application => application.family) },
            });
          }
        }

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
      return response(200, claimResponse);
    });
    if (result.body.resolved === true && result.body.duplicate !== true && playerId && typeof result.body.resolvedSpeciesId === 'number') {
      try { await refreshSpeciesCardProgress(playerId, result.body.resolvedSpeciesId); }
      catch (error) { console.error('[claims] Card progress refresh failed:', error); }
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/guess] Error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

type RunTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadFieldFacts(
  tx: RunTransaction,
  applications: ReturnType<typeof parseV3EvidenceApplications>,
) {
  if (applications.length === 0) return [];
  const rows = await tx.select().from(evidenceFamilyCards)
    .where(inArray(evidenceFamilyCards.id, applications.map(application => application.cardId)));
  const cards = rows.flatMap(row => {
    const card = parseEvidenceFamilyCard(row);
    return card ? [card] : [];
  });
  return resolveFieldFacts(applications, cards);
}

async function awardDiscovery(tx: RunTransaction, playerId: string, speciesId: number, sessionId: string | null, runId: string, finalScore: number, wrongGuessCount: number, now: Date) {
  const [species] = await tx.select({ conservationCode: speciesTable.conservationCode }).from(speciesTable).where(eq(speciesTable.id, speciesId)).limit(1);
  await tx.insert(playerSpeciesDiscoveries).values({ playerId, speciesId, sessionId, runId, incorrectGuessesCount: wrongGuessCount, scoreEarned: finalScore })
    .onConflictDoNothing({ target: [playerSpeciesDiscoveries.playerId, playerSpeciesDiscoveries.speciesId] });
  await tx.insert(speciesCards).values({
    playerId, speciesId, discovered: true, firstDiscoveredAt: now, lastEncounteredAt: now, timesEncountered: 1,
    bestRunId: runId, bestRunScore: finalScore, conservationCode: species?.conservationCode ?? null,
    rarityTier: getSpeciesCardRarityTier(species?.conservationCode),
  }).onConflictDoUpdate({ target: [speciesCards.playerId, speciesCards.speciesId], set: {
    discovered: true, firstDiscoveredAt: sql`COALESCE(${speciesCards.firstDiscoveredAt}, EXCLUDED.first_discovered_at)`, lastEncounteredAt: now,
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
