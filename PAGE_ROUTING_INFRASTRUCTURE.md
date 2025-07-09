# Page Routing Infrastructure Guide

## Overview

This document describes the page routing infrastructure for the Phaser June game, which uses Next.js with static export configuration. The application supports both complex game pages and simple content pages.

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

## Static Export Configuration

### Next.js Config (`next.config.mjs`)
```javascript
{
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,  // Critical for static hosting
  images: { unoptimized: true }
}
```

### Important Notes
- `trailingSlash: true` ensures pages are exported as `/pagename/index.html`
- This allows static servers to properly route `/highscores` to `/highscores/index.html`
- Headers defined in config won't work with static export

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
npm run build   # Build static site
npm run serve   # Serve static build locally
```

### Production Build Output
```
dist/
├── index.html           # Home page
├── highscores/
│   └── index.html      # High scores page
├── newpage/
│   └── index.html      # Your new page
└── _next/              # Static assets
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

### Static Export Limitations
- No server-side rendering
- No API routes (use external APIs)
- No dynamic routes without pre-generation
- Headers/redirects require hosting configuration

## Best Practices

1. **Consistency**: Always use `SimpleLayout` for non-game pages
2. **Type Safety**: Define TypeScript interfaces for props
3. **Accessibility**: Include proper page titles and descriptions
4. **Performance**: Lazy load heavy components when possible
5. **Error Handling**: Implement error boundaries for data fetching

## Example: High Scores Page

The high scores page demonstrates proper implementation:
- Uses `SimpleLayout` for consistent structure
- Implements real-time updates with Supabase
- Handles loading and error states
- Uses Tailwind for all styling
- Provides navigation back to game

## Future Considerations

- Consider implementing a navigation menu component
- Add breadcrumb navigation for deeper page hierarchies
- Implement page transitions for better UX
- Consider SEO optimizations for public pages
- Add analytics tracking for page views