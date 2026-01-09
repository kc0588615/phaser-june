---
sidebar_position: 4
title: Page Routing Infrastructure
description: Next.js routing with server runtime configuration
tags: [architecture, nextjs, routing]
---

# Page Routing Infrastructure

This document describes the page routing infrastructure using Next.js server runtime (API routes + Prisma).

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

## Server Runtime Configuration

### next.config.mjs

```javascript
{
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config, { webpack, isServer }) => {
    // Cesium + client fallbacks
  }
}
```

:::important trailingSlash
Setting `trailingSlash: true` keeps URL behavior consistent across pages.
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
.next/
├── server/              # Server runtime output
└── static/              # Static assets
```

## Server Runtime Notes

- API routes are available under `src/app/api/*`
- Server-side rendering is supported if needed
- Headers/redirects are handled in `next.config.mjs` or Vercel settings

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
