import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/species/by-ids?ids=1,2,3
 * POST /api/species/by-ids { ids: [1, 2, 3] }
 *
 * Batch fetch species by their ogc_fid values
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json({ species: [] });
    }

    const species = await prisma.iCAA.findMany({
      where: {
        ogc_fid: { in: ids },
      },
      orderBy: { ogc_fid: 'asc' },
    });

    return NextResponse.json({ species });
  } catch (error) {
    console.error('[API /species/by-ids] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = body.ids || [];

    if (ids.length === 0) {
      return NextResponse.json({ species: [] });
    }

    const species = await prisma.iCAA.findMany({
      where: {
        ogc_fid: { in: ids },
      },
      orderBy: { ogc_fid: 'asc' },
    });

    return NextResponse.json({ species });
  } catch (error) {
    console.error('[API /species/by-ids] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}
