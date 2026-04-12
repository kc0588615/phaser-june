/**
 * GET /api/species/deduction?mysteryId=3&albumIds=1,2,5,6
 *
 * Returns deduction profiles and clues for the comparative deduction camp.
 * - mysteryId: the hidden species ogc_fid
 * - albumIds: comma-separated ogc_fids of player's discovered album cards
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { speciesDeductionProfiles, speciesDeductionClues, icaa } from '@/db/schema';
import type { DeductionProfile, DeductionClue } from '@/lib/deductionEngine';

const profileColumns = {
  speciesId: speciesDeductionProfiles.speciesId,
  habitatTags: speciesDeductionProfiles.habitatTags,
  morphologyTags: speciesDeductionProfiles.morphologyTags,
  dietTags: speciesDeductionProfiles.dietTags,
  behaviorTags: speciesDeductionProfiles.behaviorTags,
  reproductionTags: speciesDeductionProfiles.reproductionTags,
  taxonomyTags: speciesDeductionProfiles.taxonomyTags,
};

const nameColumns = {
  ogcFid: icaa.ogcFid,
  commonName: icaa.commonName,
  scientificName: icaa.scientificName,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mysteryIdStr = searchParams.get('mysteryId');
    const albumIdsStr = searchParams.get('albumIds');

    if (!mysteryIdStr) {
      return NextResponse.json({ error: 'Missing mysteryId' }, { status: 400 });
    }

    const mysteryId = parseInt(mysteryIdStr, 10);
    if (isNaN(mysteryId)) {
      return NextResponse.json({ error: 'Invalid mysteryId' }, { status: 400 });
    }

    const albumIds = albumIdsStr
      ? albumIdsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [];

    // Fetch all needed IDs in one set
    const allIds = [mysteryId, ...albumIds];

    // Parallel: profiles, clues, names
    const [profiles, clues, names] = await Promise.all([
      db.select(profileColumns)
        .from(speciesDeductionProfiles)
        .where(inArray(speciesDeductionProfiles.speciesId, allIds)),
      db.select({
        id: speciesDeductionClues.id,
        speciesId: speciesDeductionClues.speciesId,
        category: speciesDeductionClues.category,
        label: speciesDeductionClues.label,
        compareTags: speciesDeductionClues.compareTags,
        revealOrder: speciesDeductionClues.revealOrder,
        unlockMode: speciesDeductionClues.unlockMode,
        baseCost: speciesDeductionClues.baseCost,
        isFiltering: speciesDeductionClues.isFiltering,
      })
        .from(speciesDeductionClues)
        .where(eq(speciesDeductionClues.speciesId, mysteryId)),
      db.select(nameColumns)
        .from(icaa)
        .where(inArray(icaa.ogcFid, allIds)),
    ]);

    // Build name lookup
    const nameMap = new Map(names.map(n => [n.ogcFid, n]));

    // Build DeductionProfile objects with names
    function toProfile(row: typeof profiles[number]): DeductionProfile {
      const n = nameMap.get(row.speciesId);
      return {
        speciesId: row.speciesId,
        commonName: n?.commonName ?? 'Unknown',
        scientificName: n?.scientificName ?? '',
        habitatTags: row.habitatTags ?? [],
        morphologyTags: row.morphologyTags ?? [],
        dietTags: row.dietTags ?? [],
        behaviorTags: row.behaviorTags ?? [],
        reproductionTags: row.reproductionTags ?? [],
        taxonomyTags: row.taxonomyTags ?? [],
      };
    }

    const mysteryProfileRow = profiles.find(p => p.speciesId === mysteryId);
    if (!mysteryProfileRow) {
      return NextResponse.json({ error: 'Mystery species has no deduction profile' }, { status: 404 });
    }

    const mysteryProfile = toProfile(mysteryProfileRow);
    const albumProfiles = profiles
      .filter(p => p.speciesId !== mysteryId)
      .map(toProfile);

    // Cast clues to match DeductionClue interface
    const mysteryClues: DeductionClue[] = clues.map(c => ({
      id: c.id,
      speciesId: c.speciesId,
      category: c.category,
      label: c.label,
      compareTags: c.compareTags ?? null,
      revealOrder: c.revealOrder,
      unlockMode: c.unlockMode as 'fragment' | 'score',
      baseCost: c.baseCost,
      isFiltering: c.isFiltering,
    }));

    return NextResponse.json({
      mysteryProfile,
      mysteryClues,
      albumProfiles,
    });
  } catch (error) {
    console.error('[API /species/deduction] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deduction data' }, { status: 500 });
  }
}
