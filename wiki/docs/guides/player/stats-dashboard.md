---
sidebar_position: 3
title: Stats Dashboard
description: Player statistics display
tags: [guide, stats, dashboard]
---

# Player Stats Dashboard Integration

Display player statistics from `player_stats`. Auth is required; Clerk integration is planned.

## Query Stats

```typescript
import { fetchPlayerStatsByPlayerId } from '@/lib/playerStatsService';

const stats = await fetchPlayerStatsByPlayerId(userId);
```

## Display

```tsx
<StatCard label="Species Found" value={stats.totalSpeciesDiscovered} />
<StatCard label="Total Games" value={stats.totalGamesPlayed} />
```
