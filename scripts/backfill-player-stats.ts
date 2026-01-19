/**
 * One-time backfill script to repair existing player_stats drift.
 * Run with: npx tsx scripts/backfill-player-stats.ts
 */
import { db, profiles } from '../src/db';
import { refreshPlayerStats } from '../src/lib/playerTracking';

async function main() {
  console.log('Starting player stats backfill...');

  const players = await db.select({ playerId: profiles.userId }).from(profiles);
  console.log(`Found ${players.length} players to refresh`);

  let success = 0;
  let failed = 0;

  for (const { playerId } of players) {
    try {
      const ok = await refreshPlayerStats(playerId);
      if (ok) {
        success++;
        console.log(`OK refreshed stats for ${playerId}`);
      } else {
        failed++;
        console.log(`FAIL refresh stats for ${playerId}`);
      }
    } catch (err) {
      failed++;
      console.error(`ERROR refreshing ${playerId}:`, err);
    }
  }

  console.log(`\nBackfill complete: ${success} success, ${failed} failed`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
