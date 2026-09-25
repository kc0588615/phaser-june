import { NextResponse } from 'next/server';
import { loadPlaces } from '@/lib/places';

/**
 * GET /api/places
 * Continents, countries and wildlife areas with at least two playable animals
 * (clue_match_places view), plus those animals' names for the place card.
 */
export async function GET() {
  try {
    return NextResponse.json(await loadPlaces(), { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch (error) {
    console.error('[API /places] Error:', error);
    return NextResponse.json({ error: 'Failed to load places' }, { status: 500 });
  }
}
