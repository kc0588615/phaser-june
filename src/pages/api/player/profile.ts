import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asJsonMap(val: unknown): Record<string, number> {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, number>;
  }
  return {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { db, profiles, playerStats, ecoLocationMastery } = await import('@/db');
    const { eq, desc, gt, and } = await import('drizzle-orm');

    // Resolve userId from query param or Clerk auth
    let resolvedUserId = typeof req.query.userId === 'string' ? req.query.userId : null;

    if (!resolvedUserId) {
      const { userId: clerkUserId } = getAuth(req);
      if (clerkUserId) {
        const [p] = await db.select({ userId: profiles.userId })
          .from(profiles)
          .where(eq(profiles.clerkUserId, clerkUserId))
          .limit(1);
        resolvedUserId = p?.userId ?? null;
      }
    }

    if (!resolvedUserId || !UUID_RE.test(resolvedUserId)) {
      return res.status(400).json({ error: 'valid UUID userId required or sign in' });
    }

    const userId = resolvedUserId;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const [raw] = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, userId))
      .limit(1);

    // Normalize JSONB columns from unknown → typed maps
    const stats = raw
      ? {
          totalSpeciesDiscovered: raw.totalSpeciesDiscovered,
          totalCluesUnlocked: raw.totalCluesUnlocked,
          totalScore: raw.totalScore,
          totalMovesMade: raw.totalMovesMade,
          totalGamesPlayed: raw.totalGamesPlayed,
          totalPlayTimeSeconds: raw.totalPlayTimeSeconds,
          marineSpeciesCount: raw.marineSpeciesCount,
          terrestrialSpeciesCount: raw.terrestrialSpeciesCount,
          freshwaterSpeciesCount: raw.freshwaterSpeciesCount,
          aquaticSpeciesCount: raw.aquaticSpeciesCount,
          favoriteClueCategory: raw.favoriteClueCategory,
          firstDiscoveryAt: raw.firstDiscoveryAt,
          lastDiscoveryAt: raw.lastDiscoveryAt,
          speciesByBiome: asJsonMap(raw.speciesByBiome),
          speciesByFamily: asJsonMap(raw.speciesByFamily),
          speciesByGenus: asJsonMap(raw.speciesByGenus),
          speciesByOrder: asJsonMap(raw.speciesByOrder),
          speciesByRealm: asJsonMap(raw.speciesByRealm),
          speciesByBioregion: asJsonMap(raw.speciesByBioregion),
          speciesByIucnStatus: asJsonMap(raw.speciesByIucnStatus),
          cluesByCategory: asJsonMap(raw.cluesByCategory),
        }
      : null;

    const topLocations = await db
      .select({
        locationKey: ecoLocationMastery.locationKey,
        biome: ecoLocationMastery.biome,
        realm: ecoLocationMastery.realm,
        bioregion: ecoLocationMastery.bioregion,
        runsCompleted: ecoLocationMastery.runsCompleted,
        bestRunScore: ecoLocationMastery.bestRunScore,
        totalSpeciesDiscovered: ecoLocationMastery.totalSpeciesDiscovered,
        masteryTier: ecoLocationMastery.masteryTier,
        lastPlayedAt: ecoLocationMastery.lastPlayedAt,
      })
      .from(ecoLocationMastery)
      .where(and(eq(ecoLocationMastery.playerId, userId), gt(ecoLocationMastery.runsCompleted, 0)))
      .orderBy(desc(ecoLocationMastery.masteryTier), desc(ecoLocationMastery.bestRunScore))
      .limit(6);

    return res.status(200).json({
      profile: {
        userId: profile.userId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
      },
      stats,
      topLocations,
    });
  } catch (err: any) {
    console.error('profile API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
