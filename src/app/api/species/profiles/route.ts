import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, speciesDeductionProfiles, speciesTable } from '@/db';

export async function GET(request: NextRequest) {
  try {
    const rawIds = (request.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean);
    const ids = rawIds.map(Number);
    if (ids.length < 1 || ids.length > 6 || ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: 'ids must contain 1 to 6 unique positive integers' }, { status: 400 });
    }
    const rows = await db.select({
      speciesId: speciesDeductionProfiles.speciesId,
      commonName: speciesTable.commonName,
      scientificName: speciesTable.scientificName,
      habitatTags: speciesDeductionProfiles.habitatTags,
      morphologyTags: speciesDeductionProfiles.morphologyTags,
      dietTags: speciesDeductionProfiles.dietTags,
      behaviorTags: speciesDeductionProfiles.behaviorTags,
      reproductionTags: speciesDeductionProfiles.reproductionTags,
      taxonomyTags: speciesDeductionProfiles.taxonomyTags,
      geographyTags: speciesDeductionProfiles.geographyTags,
      conservationTags: speciesDeductionProfiles.conservationTags,
      keyFactTags: speciesDeductionProfiles.keyFactTags,
      signatureTag: speciesDeductionProfiles.signatureTag,
    }).from(speciesDeductionProfiles)
      .innerJoin(speciesTable, eq(speciesTable.id, speciesDeductionProfiles.speciesId))
      .where(inArray(speciesDeductionProfiles.speciesId, ids));
    return NextResponse.json({ profiles: rows.sort((a, b) => ids.indexOf(a.speciesId) - ids.indexOf(b.speciesId)) });
  } catch (error) {
    console.error('[API GET /api/species/profiles] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
