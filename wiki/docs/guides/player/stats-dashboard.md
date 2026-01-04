---
sidebar_position: 3
title: Stats Dashboard
description: Player statistics display
tags: [guide, stats, dashboard]
---

# Player Stats Dashboard Integration

Display player statistics.

## Query Stats

```typescript
const { data } = await supabase.rpc('get_player_stats', {
  p_player_id: userId
});
```

## Display

```tsx
<StatCard label="Species Found" value={stats.total_species_found} />
<StatCard label="Total Games" value={stats.total_games} />
```
