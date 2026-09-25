// Loads the Clue Match pool from Postgres. Shared by GET /api/clue-game/pool and
// scripts/content.ts.
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { poolFromRows, type CluePool, type ContentRows } from '@/clueGame/pool';

// The app singleton or a script's own client.
type Database = PostgresJsDatabase<Record<string, unknown>>;

export async function buildCluePool(db: Database): Promise<CluePool> {
  const [species, clues, facts] = await Promise.all([
    db.execute<ContentRows['species'][number]>(sql`
      SELECT id, common_name, scientific_name, class, taxon_order, family, genus, conservation_code, redlist_url,
             photo_url, photo_credit, photo_license, photo_page
      FROM species`),
    db.execute<ContentRows['clues'][number]>(sql`
      SELECT id, species_id, category, label, compare_tags, reveal_order, is_filtering FROM species_deduction_clues`),
    db.execute<ContentRows['facts'][number]>(sql`
      SELECT f.species_id, f.category, f.fact_text, f.sort_order, s.name AS source_name, coalesce(f.source_url, s.url) AS source_url
      FROM species_facts f LEFT JOIN content_sources s ON s.key = f.source_key`),
  ]);
  return poolFromRows({ species: [...species], clues: [...clues], facts: [...facts] });
}
