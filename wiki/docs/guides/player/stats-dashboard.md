---
sidebar_position: 3
title: Stats Dashboard
description: Player statistics display
tags: [guide, stats, dashboard]
---

# Player Stats Dashboard Integration

`/stats` (`src/pages/stats.tsx`) renders `ProfileContent`, which loads the signed-in player's profile and `player_stats` aggregates from `GET /api/player/profile` (pass `?userId=` to view another player).

## Query Stats

```typescript
const res = await fetch('/api/player/profile');
const profile = await res.json();
```

The old `PlayerStatsDashboard` component and `src/lib/playerStatsService.ts` were never mounted and were removed in plan 039.
