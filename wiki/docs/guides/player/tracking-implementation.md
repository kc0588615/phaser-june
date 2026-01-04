---
sidebar_position: 1
title: Player Tracking Implementation
description: Telemetry and session recording
tags: [guide, tracking, analytics]
---

# Player Tracking Implementation

How player sessions and discoveries are tracked.

## Session Management

```typescript
// src/lib/playerTracking.ts
export async function startSession(lon: number, lat: number) {
  const { data } = await supabase
    .from('game_sessions')
    .insert({ player_id: userId, location_lon: lon, location_lat: lat })
    .select()
    .single();
  return data;
}
```

## Event Recording

Clue and species discoveries are recorded via RPC functions.
