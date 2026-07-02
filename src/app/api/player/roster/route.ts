import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, playerSpeciesDiscoveries, speciesCombatTraits, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { derivePartnerPassive, type MatchBattlePartner } from '@/game/matchBattle/partner';

export async function GET() {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select({
        speciesId: speciesTable.id,
        commonName: speciesTable.commonName,
        scientificName: speciesTable.scientificName,
        sizeClass: speciesCombatTraits.sizeClass,
        defenseType: speciesCombatTraits.defenseType,
        combatArchetype: speciesCombatTraits.combatArchetype,
        combatTier: speciesCombatTraits.combatTier,
      })
      .from(playerSpeciesDiscoveries)
      .innerJoin(speciesTable, eq(speciesTable.id, playerSpeciesDiscoveries.speciesId))
      .innerJoin(speciesCombatTraits, eq(speciesCombatTraits.speciesId, speciesTable.id))
      .where(eq(playerSpeciesDiscoveries.playerId, playerId))
      .orderBy(asc(speciesTable.commonName))
      .limit(100);

    const roster: MatchBattlePartner[] = rows.map(row => ({
      speciesId: row.speciesId,
      commonName: row.commonName,
      scientificName: row.scientificName,
      sizeClass: row.sizeClass,
      defenseType: row.defenseType,
      combatArchetype: row.combatArchetype,
      combatTier: row.combatTier,
      passive: derivePartnerPassive(row),
    }));

    return NextResponse.json({ roster });
  } catch (error) {
    console.error('[API GET /api/player/roster] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}
