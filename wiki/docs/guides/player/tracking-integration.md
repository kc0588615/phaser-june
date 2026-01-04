---
sidebar_position: 2
title: Tracking Integration
description: Integrating tracking with game events
tags: [guide, tracking, eventbus]
---

# Player Tracking Integration Plan

Connect tracking to EventBus events.

## Event Listeners

```typescript
EventBus.on('clue-revealed', async (data) => {
  await recordClueDiscovery(sessionId, data.speciesId, data.name);
});
```
