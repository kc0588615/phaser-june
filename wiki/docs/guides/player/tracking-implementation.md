---
sidebar_position: 1
title: Player Tracking Implementation
description: Telemetry and session recording
tags: [guide, tracking, analytics]
---

# Player Tracking Implementation

How player sessions and discoveries are tracked (Prisma + Postgres). Auth is not wired yet, so calls require a `playerId` once Clerk is integrated.

## Session Management

```typescript
import { startGameSession, endGameSession } from '@/lib/playerTracking';

const sessionId = await startGameSession(playerId);
// ... gameplay ...
await endGameSession(sessionId, finalMoves, finalScore);
```

## Event Recording

```typescript
import {
  trackClueUnlock,
  trackSpeciesDiscovery,
  updateSessionProgress,
} from '@/lib/playerTracking';

await trackClueUnlock(playerId, speciesId, category, field, value, null);
await updateSessionProgress(sessionId, moves, score, speciesDiscovered, cluesUnlocked);
await trackSpeciesDiscovery(playerId, speciesId, {
  sessionId,
  cluesUnlockedBeforeGuess,
  incorrectGuessesCount,
  scoreEarned,
});
```

## Offline Queue

Failed writes are queued in localStorage and retried via `processOfflineQueue(playerId)`.

## Migration from Local Storage

Use `DiscoveryMigrationService` after login to migrate guest discoveries:

```typescript
import { DiscoveryMigrationService } from '@/services/discoveryMigrationService';

if (DiscoveryMigrationService.needsMigration()) {
  await DiscoveryMigrationService.migrateLocalDiscoveries(playerId);
}
```
