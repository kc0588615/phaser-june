// Discovery Migration Service
// Migrates localStorage discoveries to database via API

export class DiscoveryMigrationService {
  /**
   * Migrate localStorage discoveries to database on first login
   * Call this after successful authentication
   */
  static async migrateLocalDiscoveries(userId: string): Promise<void> {
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

      // Call API to migrate
      const response = await fetch('/api/discoveries/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          discoveries: localDiscoveries,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Migration failed');
      }

      const result = await response.json();
      console.log(`Successfully migrated ${result.migrated} discoveries`);

      // Mark as migrated
      localStorage.setItem('discoveries_migrated', 'true');
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
