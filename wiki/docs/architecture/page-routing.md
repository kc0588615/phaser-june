---
sidebar_position: 4
title: Page Routing Infrastructure
description: Next.js routing with static export configuration
tags: [architecture, nextjs, routing]
---

# Page Routing Infrastructure

This document describes the page routing infrastructure using Next.js with static export configuration.

## Page Types

### 1. Complex Game Pages

Example: `index.tsx`

- Uses `MainAppLayout.tsx` for game-specific functionality
- Manages Phaser game canvas and Cesium 3D map
- Requires complex state management and EventBus communication

### 2. Simple Content Pages

Example: `highscores.tsx`

- Uses `SimpleLayout.tsx` for consistent styling
- Standard React pages with data fetching
- No game engine dependencies

## Key Components

### SimpleLayout Component

**Location:** `src/components/SimpleLayout.tsx`

```typescript
interface SimpleLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}
```

Provides:
- Consistent page structure for non-game pages
- Head metadata handling
- Dark theme styling via Tailwind CSS
- Responsive container wrapper

### Application Structure

| File | Purpose |
|------|---------|
| `src/pages/_app.tsx` | Global app wrapper |
| `src/pages/_document.tsx` | HTML document structure with dark theme |
| `src/styles/globals.css` | Global styles and Tailwind configuration |

## Static Export Configuration

### next.config.mjs

```javascript
{
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,  // Critical for static hosting
  images: { unoptimized: true }
}
```

:::important trailingSlash
Setting `trailingSlash: true` ensures pages export as `/pagename/index.html`, allowing static servers to properly route `/highscores` to `/highscores/index.html`.
:::

## Adding New Pages

### Step 1: Create the Page Component

```typescript
// src/pages/newpage.tsx
import SimpleLayout from '@/components/SimpleLayout';

export default function NewPage() {
  return (
    <SimpleLayout title="Page Title" description="Page description">
      {/* Your content here */}
    </SimpleLayout>
  );
}
```

### Step 2: Use Tailwind CSS

Follow the dark theme color scheme:

| Class | Usage |
|-------|-------|
| `bg-card` | Card backgrounds |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text |
| `border-border` | Borders |
| `text-primary` | Accent color |

### Step 3: Add Navigation

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

<Link href="/newpage">
  <Button variant="outline">Go to New Page</Button>
</Link>
```

## Build Output

```
dist/
├── index.html           # Home page
├── highscores/
│   └── index.html      # High scores page
├── newpage/
│   └── index.html      # Your new page
└── _next/              # Static assets
```

## Static Export Limitations

- No server-side rendering
- No API routes (use external APIs like Supabase)
- No dynamic routes without pre-generation
- Headers/redirects require hosting configuration

## Common Issues

### 404 Errors on Routes

**Cause:** Page structure issues

**Solution:**
1. Use proper Next.js page structure
2. No standalone HTML/head tags
3. Page must integrate with `_app.tsx`
4. Ensure `trailingSlash: true` in config

### Styling Inconsistencies

**Cause:** Not using theme system

**Solution:**
1. Use `SimpleLayout` component
2. Apply Tailwind classes instead of inline styles
3. Reference theme variables from `globals.css`

## Best Practices

1. **Consistency:** Always use `SimpleLayout` for non-game pages
2. **Type Safety:** Define TypeScript interfaces for props
3. **Accessibility:** Include proper page titles and descriptions
4. **Performance:** Lazy load heavy components
5. **Error Handling:** Implement error boundaries for data fetching
