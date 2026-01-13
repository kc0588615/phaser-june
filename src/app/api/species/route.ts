// =============================================================================
// API ROUTE: /api/species
// =============================================================================
// This is a Next.js App Router API route that demonstrates Drizzle usage.
//
// ENDPOINTS:
// - GET /api/species           → List all species (catalog)
// - GET /api/species?id=1      → Get single species by ID
// - GET /api/species?search=x  → Search species by name
// - GET /api/species?realm=x   → Filter by realm
// - GET /api/species?status=x  → Filter by conservation status
//
// WHY AN API ROUTE?
// -----------------
// While you can call Drizzle directly from Server Components, API routes are
// useful when:
// - Client components need data (can't use server-only code)
// - You want a REST API for other consumers (mobile apps, etc.)
// - You need to add caching headers or rate limiting
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getSpeciesCatalog,
  getSpeciesById,
  searchSpecies,
  getSpeciesByRealm,
  getSpeciesByConservationStatus,
} from '@/lib/speciesQueries';

/**
 * GET /api/species
 *
 * Query Parameters:
 * - id: number - Get single species by ID
 * - search: string - Search by common or scientific name
 * - realm: string - Filter by biogeographic realm
 * - status: string - Filter by IUCN status (comma-separated: CR,EN,VU)
 *
 * @example
 * ```
 * // Get all species
 * fetch('/api/species')
 *
 * // Get species by ID
 * fetch('/api/species?id=1')
 *
 * // Search by name
 * fetch('/api/species?search=turtle')
 *
 * // Filter by realm
 * fetch('/api/species?realm=Nearctic')
 *
 * // Filter by conservation status
 * fetch('/api/species?status=CR,EN')
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const realm = searchParams.get('realm');
    const status = searchParams.get('status');

    // Route to appropriate handler based on query params

    // 1. Get single species by ID
    if (id) {
      const speciesId = parseInt(id, 10);
      if (isNaN(speciesId)) {
        return NextResponse.json(
          { error: 'Invalid species ID' },
          { status: 400 }
        );
      }

      const species = await getSpeciesById(speciesId);
      if (!species) {
        return NextResponse.json(
          { error: 'Species not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ species });
    }

    // 2. Search by name
    if (search) {
      const results = await searchSpecies(search);
      return NextResponse.json({
        species: results,
        count: results.length,
        query: search,
      });
    }

    // 3. Filter by realm
    if (realm) {
      const results = await getSpeciesByRealm(realm);
      return NextResponse.json({
        species: results,
        count: results.length,
        realm,
      });
    }

    // 4. Filter by conservation status
    if (status) {
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      const validStatuses = ['CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'EX', 'EW'];
      const filteredStatuses = statuses.filter((s) => validStatuses.includes(s));

      if (filteredStatuses.length === 0) {
        return NextResponse.json(
          { error: `Invalid status. Valid values: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      const results = await getSpeciesByConservationStatus(filteredStatuses);
      return NextResponse.json({
        species: results,
        count: results.length,
        statuses: filteredStatuses,
      });
    }

    // 5. Default: return full catalog
    const catalog = await getSpeciesCatalog();
    return NextResponse.json({
      species: catalog,
      count: catalog.length,
    });
  } catch (error) {
    console.error('[API /species] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species data' },
      { status: 500 }
    );
  }
}
