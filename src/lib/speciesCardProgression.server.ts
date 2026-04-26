import { and, eq, sql } from 'drizzle-orm';
import { db, speciesCards } from '@/db';
import { calculateSpeciesCardCompletion, getSpeciesCardRarityTier, getSpeciesCardVariant } from '@/lib/speciesCardProgression';

export async function refreshSpeciesCardProgress(playerId: string, speciesId: number): Promise<void> {
  const [card] = await db
    .select({
      discovered: speciesCards.discovered,
      timesEncountered: speciesCards.timesEncountered,
      conservationCode: speciesCards.conservationCode,
      factsUnlocked: speciesCards.factsUnlocked,
      clueCategoriesUnlocked: speciesCards.clueCategoriesUnlocked,
      gisStamps: speciesCards.gisStamps,
    })
    .from(speciesCards)
    .where(and(eq(speciesCards.playerId, playerId), eq(speciesCards.speciesId, speciesId)))
    .limit(1);

  if (!card) return;

  const completionPct = calculateSpeciesCardCompletion(card);
  const cardVariant = getSpeciesCardVariant(completionPct);

  await db
    .update(speciesCards)
    .set({
      completionPct,
      rarityTier: getSpeciesCardRarityTier(card.conservationCode),
      ...(cardVariant ? { cardVariant: sql`COALESCE(${speciesCards.cardVariant}, ${cardVariant})` } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(speciesCards.playerId, playerId), eq(speciesCards.speciesId, speciesId)));
}
