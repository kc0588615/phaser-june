// src/services/discoveryMigrationService.ts

import { supabaseBrowser } from '@/lib/supabase-browser';

export class DiscoveryMigrationService {
  /**
   * Migrate localStorage discoveries to database on first login
   * Call this after successful authentication
   */
  static async migrateLocalDiscoveries(userId: string): Promise<void> {
    // SSR safety guard
    if (typeof window === 'undefined') return;

    try {
      // Check if already migrated
      const migrationFlag = localStorage.getItem('discoveries_migrated');
      if (migrationFlag === 'true') {
        console.log('Discoveries already migrated, skipping');
        return;
      }

      // Get local discoveries
      const localStorageData = localStorage.getItem('discoveredSpecies');
      if (!localStorageData) {
        console.log('No local discoveries to migrate');
        localStorage.setItem('discoveries_migrated', 'true');
        return;
      }

      const localDiscoveries = JSON.parse(localStorageData);
      if (!Array.isArray(localDiscoveries) || localDiscoveries.length === 0) {
        console.log('No valid local discoveries to migrate');
        localStorage.setItem('discoveries_migrated', 'true');
        return;
      }

      console.log(`Migrating ${localDiscoveries.length} local discoveries...`);

      // Create Supabase client
      const supabase = supabaseBrowser();

      // Gather candidate species IDs (numeric only for the foreign key)
      const candidateSpeciesIds = Array.from(
        new Set(
          localDiscoveries
            .map((d: any) => Number(d.id))
            .filter((id: number) => Number.isFinite(id))
        )
      );

      console.log(`📋 Validating ${candidateSpeciesIds.length} unique species IDs:`, candidateSpeciesIds);

      let validSpeciesIds = new Set<number>();

      if (candidateSpeciesIds.length > 0) {
        const { data: existingSpecies, error: speciesError } = await supabase
          .from('icaa')
          .select('ogc_fid')
          .in('ogc_fid', candidateSpeciesIds);

        if (speciesError) {
          console.error('Failed to verify species existence for migration:', speciesError);
          throw speciesError;
        }

        validSpeciesIds = new Set((existingSpecies ?? []).map((row: { ogc_fid: number }) => row.ogc_fid));
        const invalidIds = candidateSpeciesIds.filter(id => !validSpeciesIds.has(id));

        console.log(`✅ Found ${validSpeciesIds.size} valid species in database`);
        if (invalidIds.length > 0) {
          console.warn(`⚠️  Skipping ${invalidIds.length} invalid species IDs:`, invalidIds);
        }
      }

      const discoveries = localDiscoveries
        .map((d: any) => {
          const parsedSpeciesId = Number(d.id);
          if (!Number.isFinite(parsedSpeciesId)) {
            return null;
          }

          if (!validSpeciesIds.has(parsedSpeciesId)) {
            // Already logged in the summary above, no need for per-record warning
            return null;
          }

          return {
            player_id: userId,
            species_id: parsedSpeciesId,
            discovered_at: d.discoveredAt || new Date().toISOString(),
            clues_unlocked_before_guess: 0, // Unknown for migrated data
            incorrect_guesses_count: 0,     // Unknown for migrated data
            score_earned: 0,                // Unknown for migrated data
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      if (discoveries.length === 0) {
        console.warn('⚠️  No valid local discoveries matched current species data. Marking as migrated.');
        localStorage.setItem('discoveries_migrated', 'true');
        return;
      }

      console.log(`💾 Upserting ${discoveries.length} valid discoveries to database...`);

      // Insert to database (UPSERT to handle duplicates)
      const { error } = await supabase
        .from('player_species_discoveries')
        .upsert(discoveries, {
          onConflict: 'player_id,species_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('❌ Migration failed:', error);
        throw error;
      }

      console.log(`✅ Successfully migrated ${discoveries.length} discoveries`);

      // Mark as migrated
      localStorage.setItem('discoveries_migrated', 'true');

      // Optional: Keep localStorage data for backward compatibility
      // Or clear it: localStorage.removeItem('discoveredSpecies');

    } catch (error) {
      console.error('Failed to migrate local discoveries:', error);
      // Don't set migration flag so we can retry
    }
  }

  /**
   * Check if migration is needed (has local data + not yet migrated)
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;

    const migrationFlag = localStorage.getItem('discoveries_migrated');
    const localData = localStorage.getItem('discoveredSpecies');

    return migrationFlag !== 'true' && !!localData;
  }
}
