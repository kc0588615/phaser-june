# shadcn/ui Implementation Guide for Phaser-React Integration

## Overview

This guide documents the successful implementation of shadcn/ui components in a Phaser 3 + Next.js game project, with specific focus on creating UI overlays that properly render above the game canvas and integrate with game business logic via EventBus.

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Implementation Steps](#implementation-steps)
3. [Key Learnings](#key-learnings)
4. [Component Communication](#component-communication)
5. [Z-Index Management](#z-index-management)
6. [Future Implementation Guidelines](#future-implementation-guidelines)

## Project Architecture

### Technology Stack
- **Game Engine**: Phaser 3.90.0
- **Framework**: Next.js 15.3.1 with React 18
- **UI Library**: shadcn/ui with Radix UI primitives
- **CSS Framework**: Tailwind CSS v4 with PostCSS
- **State Management**: EventBus pattern for React-Phaser communication

### Key Components Created

1. **SpeciesPanel** (`src/components/SpeciesPanel.tsx`)
   - Replaces the original ClueDisplay component
   - Features a shadcn Menubar header with dropdown menus
   - Maintains all original game logic and EventBus integration

2. **GemLegendDialog** (`src/components/GemLegendDialog.tsx`)
   - Modal dialog showing gem-to-category mappings
   - Properly overlays the Phaser game canvas
   - Uses shadcn Dialog component with custom styling

## Implementation Steps

### 1. Foundation Setup

#### Dependencies Installation
```bash
# Core Tailwind and PostCSS dependencies
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss tailwindcss-animate

# shadcn/ui utilities and dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react

# Radix UI primitives
npm install @radix-ui/react-menubar @radix-ui/react-dialog @radix-ui/react-separator @radix-ui/react-slot
```

#### Configuration Files

**tailwind.config.js**
```javascript
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        // ... other color definitions
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**postcss.config.js** (Tailwind v4 compatible)
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**components.json**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 2. CSS Integration

#### Global Styles Setup
```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global reset for full-screen display */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

@layer base {
  :root {
    /* Light theme variables */
    --background: 0 0% 100%;
    --foreground: 224 71.4% 4.1%;
    /* ... other variables */
  }

  .dark {
    /* Dark theme variables */
    --background: 224 71.4% 4.1%;
    --foreground: 210 20% 98%;
    /* ... other variables */
  }
}

/* Ensure full viewport coverage */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#__next {
  width: 100%;
  height: 100%;
}
```

#### Dark Mode Setup
```tsx
// src/pages/_document.tsx
<Html lang="en" className="dark">
```

### 3. Component Installation

```bash
# Install shadcn components
npx shadcn@latest add menubar dialog button card separator
```

## Key Learnings

### 1. Z-Index Management for Phaser Overlays

**Problem**: Dialog components appeared behind the Phaser game canvas.

**Solution**: Implement explicit z-index hierarchy:

```tsx
// PhaserGame.tsx - Set game container z-index
<div id="game-container" style={{ position: 'relative', zIndex: 1 }}></div>

// dialog.tsx - Set high z-index for overlays
className={cn(
  "fixed inset-0 z-[9999] bg-black/90", // Overlay
  className
)}

// Dialog content even higher
className={cn(
  "fixed top-[50%] left-[50%] z-[10000]", // Content
  className
)}
```

### 2. React forwardRef Requirements

**Problem**: Warning about function components not accepting refs.

**Solution**: Use React.forwardRef for Radix UI primitive wrappers:

```tsx
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    // ... rest of component
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName
```

### 3. Tailwind v4 Compatibility

**Problem**: PostCSS configuration errors with Tailwind v4.

**Solution**: Use `@tailwindcss/postcss` instead of direct `tailwindcss`:

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // Not 'tailwindcss'
    autoprefixer: {},
  },
}
```

### 4. Asset Path Resolution

**Problem**: Gem images returned 404 errors.

**Solution**: Match actual file naming convention:

```tsx
// Incorrect
src={`/assets/gems/gem${gemId}.png`}

// Correct - matches actual file structure
src={`/assets/${gemId}_gem_0.png`}
```

## Component Communication

### EventBus Integration Pattern

The SpeciesPanel maintains all original ClueDisplay functionality through EventBus:

```tsx
useEffect(() => {
  // Listen for game events
  const handleClueRevealed = (clueData: ClueData) => {
    setIsLoadingClue(true);
    setTimeout(() => {
      setClues(prev => [...prev, clueData]);
      setIsLoadingClue(false);
    }, 500);
  };

  const handleNewGame = (data: { 
    speciesName: string; 
    speciesId: number; 
    totalSpecies: number; 
    currentIndex: number 
  }) => {
    setClues([]);
    setSelectedSpeciesName(data.speciesName);
    // ... update other state
  };

  // Register listeners
  EventBus.on('clue-revealed', handleClueRevealed);
  EventBus.on('new-game-started', handleNewGame);
  // ... other listeners

  // Cleanup
  return () => {
    EventBus.off('clue-revealed', handleClueRevealed);
    EventBus.off('new-game-started', handleNewGame);
    // ... remove other listeners
  };
}, []);
```

### Data Flow
1. **Phaser → React**: Game emits events via EventBus
2. **React State**: Components update local state based on events
3. **UI Update**: shadcn components render based on state
4. **User Interaction**: Menu actions can emit events back to Phaser

## Z-Index Management

### Layering Strategy

```
Layer 0 (z-index: auto): Document flow
Layer 1 (z-index: 1): Phaser game canvas
Layer 50 (z-index: 50): Standard UI elements
Layer 1000 (z-index: 1000): Cesium minimize button
Layer 9999 (z-index: 9999): Modal overlays
Layer 10000 (z-index: 10000): Modal content
```

### Best Practices

1. **Always set explicit z-index** on game containers
2. **Use high z-index values** for modal overlays (9999+)
3. **Portal components** render at document body level
4. **Test overlay behavior** with game running

## Future Implementation Guidelines

### Adding New shadcn Components

1. **Install via CLI**:
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. **Check for forwardRef requirements** if using with primitives

3. **Apply dark theme classes** for game consistency:
   ```tsx
   className="bg-black/95 border-gray-700"
   ```

4. **Set appropriate z-index** for overlays:
   ```tsx
   className="z-[9999]" // For overlays
   className="z-[10000]" // For overlay content
   ```

### Creating Game-Integrated Components

1. **Import EventBus**:
   ```tsx
   import { EventBus } from '../game/EventBus';
   ```

2. **Set up listeners in useEffect**:
   ```tsx
   useEffect(() => {
     const handler = (data) => { /* handle event */ };
     EventBus.on('event-name', handler);
     return () => EventBus.off('event-name', handler);
   }, []);
   ```

3. **Preserve existing game logic** when refactoring

4. **Test responsive behavior** at different viewport sizes

### Menubar Implementation Pattern

```tsx
<Menubar className="rounded-none border-b border-gray-700">
  <MenubarMenu>
    <MenubarTrigger>Menu Title</MenubarTrigger>
    <MenubarContent>
      <MenubarItem onClick={handleAction}>
        Action Label <MenubarShortcut>⌘K</MenubarShortcut>
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem disabled>Disabled Item</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

### Dialog Implementation Pattern

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="bg-black/95 border-gray-700">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Troubleshooting

### Common Issues and Solutions

1. **Components not visible over game**
   - Check z-index values
   - Ensure portal components are used
   - Verify game container has lower z-index

2. **Styling not applied**
   - Check Tailwind content paths in config
   - Verify PostCSS configuration
   - Ensure CSS file imports are correct

3. **TypeScript errors**
   - Run `npm run typecheck` to identify issues
   - Check component prop types match usage
   - Verify all imports are correct

4. **Asset loading failures**
   - Verify file paths match actual structure
   - Check public directory structure
   - Ensure assets are in correct location

## Conclusion

This implementation successfully integrates shadcn/ui with a Phaser game, providing:
- Modern UI components that overlay the game canvas
- Seamless communication between React UI and Phaser game logic
- Responsive design that adapts to viewport changes
- Dark theme consistency with game aesthetics

The pattern established here can be extended to add more UI components while maintaining game functionality and visual coherence.