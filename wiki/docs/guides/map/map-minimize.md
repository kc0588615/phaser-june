---
sidebar_position: 3
title: Map Minimize
description: Collapsing the map to expand game area
tags: [guide, layout]
---

# Map Minimize Implementation

Allow users to collapse the map for more game space.

## React State

```typescript
const [mapMinimized, setMapMinimized] = useState(false);

<div style={{ height: mapMinimized ? '0%' : '30%' }}>
  <CesiumMap />
</div>
```

## Notify Phaser

```typescript
useEffect(() => {
  EventBus.emit('layout-changed', { mapMinimized });
}, [mapMinimized]);
```
