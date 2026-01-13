# Page Routing Infrastructure Guide

## Overview

This document describes the page routing infrastructure for the Phaser June game, which uses Next.js server runtime (API routes + Drizzle). The application supports both complex game pages and simple content pages.

## Architecture

### Page Types

1. **Complex Game Pages** (e.g., `index.tsx`)
   - Uses `MainAppLayout.tsx` for game-specific functionality
   - Manages Phaser game canvas and Cesium 3D map
   - Requires complex state management and inter-component communication

2. **Simple Content Pages** (e.g., `highscores.tsx`)
   - Uses `SimpleLayout.tsx` for consistent styling
   - Standard React pages with data fetching
   - No game engine dependencies

### Key Components

#### SimpleLayout Component (`src/components/SimpleLayout.tsx`)
- Provides consistent page structure for non-game pages
- Handles head metadata, title, and description
- Applies dark theme styling using Tailwind CSS classes
- Wraps content in a responsive container

```typescript
interface SimpleLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}
```

#### Application Structure
- `src/pages/_app.tsx` - Global app wrapper
- `src/pages/_document.tsx` - HTML document structure with dark theme
- `src/styles/globals.css` - Global styles and Tailwind configuration

## Server Runtime Configuration

### Next.js Config (`next.config.mjs`)
```javascript
{
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config, { webpack, isServer }) => {
    // Cesium + client fallbacks
  }
}
```

### Important Notes
- Server runtime is required for API routes and database access.
- `trailingSlash: true` is kept for URL consistency across pages.
- Builds use `next build --webpack` to keep Cesium’s webpack config.
- Headers in `next.config.mjs` apply normally.

## Adding New Pages

### 1. Create the Page Component
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

### 2. Use Tailwind CSS for Styling
- Avoid inline styles
- Use Tailwind utility classes
- Follow the dark theme color scheme:
  - `bg-card` - Card backgrounds
  - `text-foreground` - Primary text
  - `text-muted-foreground` - Secondary text
  - `border-border` - Borders
  - `text-primary` - Accent color

### 3. Navigation
```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

<Link href="/newpage">
  <Button variant="outline">Go to New Page</Button>
</Link>
```

## Build and Deployment

### Local Development
```bash
npm run dev     # Development server (may have routing limitations)
npm run build   # Build .next/ for server runtime
npm run serve   # Run Next.js server locally
```

### Production Build Output
```
.next/
├── server/              # Server runtime output
└── static/              # Static assets
```

## Common Issues and Solutions

### 404 Errors on Routes
**Problem**: Page returns 404 even though file exists
**Solution**: Ensure:
1. Page uses proper Next.js page structure
2. No standalone HTML/head tags
3. Page integrates with `_app.tsx`
4. `trailingSlash: true` in config

### Styling Inconsistencies
**Problem**: Page doesn't match app theme
**Solution**: 
1. Use `SimpleLayout` component
2. Apply Tailwind classes instead of inline styles
3. Reference theme variables from `globals.css`

### Server Runtime Notes
- API routes are available under `src/app/api/*`
- Server-side rendering is supported if needed
- Headers/redirects are handled in `next.config.mjs` or Vercel settings

## Best Practices

1. **Consistency**: Always use `SimpleLayout` for non-game pages
2. **Type Safety**: Define TypeScript interfaces for props
3. **Accessibility**: Include proper page titles and descriptions
4. **Performance**: Lazy load heavy components when possible
5. **Error Handling**: Implement error boundaries for data fetching

## Example: High Scores Page

The high scores page demonstrates proper implementation:
- Uses `SimpleLayout` for consistent structure
- Fetches scores via `/api/highscores` (Drizzle)
- Handles loading and error states
- Uses Tailwind for all styling
- Provides navigation back to game

## Future Considerations

- Consider implementing a navigation menu component
- Add breadcrumb navigation for deeper page hierarchies
- Implement page transitions for better UX
- Consider SEO optimizations for public pages
- Add analytics tracking for page views
