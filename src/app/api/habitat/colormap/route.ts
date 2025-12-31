import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/habitat/colormap
 * Returns habitat code → label mapping for TiTiler raster legend
 */
export async function GET() {
  try {
    const colormap = await prisma.habitatColormap.findMany({
      select: {
        value: true,
        label: true,
      },
    });

    return NextResponse.json(colormap);
  } catch (error) {
    console.error('[API /habitat/colormap] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habitat colormap' },
      { status: 500 }
    );
  }
}
