---
sidebar_position: 3
title: Layout Restructure
description: Aligning React and Phaser layouts
tags: [guide, layout, responsive]
---

# Layout Restructure Implementation

How the layout was restructured to align React UI with Phaser canvas.

## The Challenge

React manages the page layout (flexbox, heights) while Phaser manages the game canvas. They must stay synchronized when:
- Window resizes
- Map section minimizes/expands
- Orientation changes (mobile)

## Solution: EventBus Layout Sync

```typescript
// MainAppLayout.tsx
useEffect(() => {
  EventBus.emit('layout-changed', { mapMinimized: cesiumMinimized });
}, [cesiumMinimized]);

// Game.ts
EventBus.on('layout-changed', this.handleLayoutChange, this);
```

## Container Structure

```css
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.cesium-container { height: 30%; }
.phaser-container { flex: 1; }
.game-ui-panel { height: 150px; }
```

## Related

- [UI Display System](/docs/architecture/ui-display-system)
- [Game Reactivity](/docs/architecture/game-reactivity)
