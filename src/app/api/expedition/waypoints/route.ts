import { NextRequest, NextResponse } from 'next/server';
import { harvestExpeditionWaypoints } from '@/lib/waypointHarvesting';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lon = Number(searchParams.get('lon'));
    const lat = Number(searchParams.get('lat'));
    const debug = searchParams.get('debug') === 'true';

    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'Missing or invalid lon/lat parameters' }, { status: 400 });
    }

    const result = await harvestExpeditionWaypoints({ lon, lat });
    const response = debug ? result : {
      origin: result.origin,
      radiusKm: result.radiusKm,
      waypoints: result.waypoints,
      routePolyline: result.routePolyline,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /expedition/waypoints] Error:', error);
    return NextResponse.json({ error: 'Failed to harvest expedition waypoints' }, { status: 500 });
  }
}
