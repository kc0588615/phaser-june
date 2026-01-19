import { NextResponse } from 'next/server';
import { db, habitatColormap } from '@/db';

/**
 * GET /api/habitat/colormap
 * Returns habitat code → label mapping for TiTiler raster legend
 */
export async function GET() {
  try {
    const colormap = await db
      .select({
        value: habitatColormap.value,
        label: habitatColormap.label,
      })
      .from(habitatColormap);

    return NextResponse.json(colormap);
  } catch (error) {
    console.error('[API /habitat/colormap] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habitat colormap' },
      { status: 500 }
    );
  }
}
