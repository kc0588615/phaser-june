import { NextResponse, type NextRequest } from 'next/server';
import { loadPlaceOutline } from '@/lib/places';

/** GET /api/places/outline?key=country:KEN — the place's outline as a GeoJSON Feature. */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') ?? '';
  if (!/^(country|area|continent):[A-Za-z0-9-]{1,80}$/.test(key)) {
    return NextResponse.json({ error: 'key must look like country:KEN' }, { status: 400 });
  }
  try {
    const outline = await loadPlaceOutline(key);
    if (!outline) return NextResponse.json({ error: 'Unknown place' }, { status: 404 });
    return NextResponse.json(outline, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('[API /places/outline] Error:', error);
    return NextResponse.json({ error: 'Failed to load the outline' }, { status: 500 });
  }
}
