import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/species/catalog
 * Returns all species for the species list/catalog view.
 */
export async function GET() {
  try {
    const species = await prisma.iCAA.findMany({
      orderBy: { comm_name: 'asc' },
    });

    return NextResponse.json({
      species,
      count: species.length,
    });
  } catch (error) {
    console.error('[API /species/catalog] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species catalog' },
      { status: 500 }
    );
  }
}
