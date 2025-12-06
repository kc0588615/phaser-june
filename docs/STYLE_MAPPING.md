# Species Components Style Mapping

## Color Mappings

### Hard-coded Colors → Theme Variables
- `#0f172a` → `bg-background` (dark theme background)
- `#f1f5f9` → `text-foreground` (main text)
- `#94a3b8` → `text-muted-foreground` (secondary text)
- `rgba(30, 41, 59, 0.9)` → `bg-card/90` or `bg-secondary/90`
- `rgba(30, 41, 59, 0.5)` → `bg-card/50` or `bg-secondary/50`
- `#475569` → `border-border` or `border-secondary`
- `#e2e8f0` → `text-card-foreground` or `text-secondary-foreground`
- `#3b82f6` → `text-primary` (for loader)
- `#ef4444` → `text-destructive` (for errors)
- `rgba(239, 68, 68, 0.1)` → `bg-destructive/10`
- `rgba(239, 68, 68, 0.3)` → `border-destructive/30`
- `rgba(15, 23, 42, 0.95)` → `bg-background/95`

## SpeciesList.tsx Inline Styles

### Container Styles
```tsx
// Current inline style
style={{ 
  padding: '40px 20px 20px 20px',
  overflowY: 'auto',
  overflowX: 'hidden',
  height: '100%',
  backgroundColor: '#0f172a',
  width: '100%',
  boxSizing: 'border-box'
}}

// Tailwind equivalent
className="py-10 px-5 pt-5 overflow-y-auto overflow-x-hidden h-full bg-background w-full box-border"
```

### Title Styles
```tsx
// Current inline style
style={{ 
  fontSize: '48px', 
  fontWeight: 'bold', 
  textAlign: 'center', 
  marginBottom: '16px',
  marginTop: '40px',
  color: '#f1f5f9'
}}

// Tailwind equivalent
className="text-5xl font-bold text-center mb-4 mt-10 text-foreground"
```

### Error Alert
```tsx
// Current inline style
style={{ 
  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
  border: '1px solid rgba(239, 68, 68, 0.3)', 
  borderRadius: '8px', 
  padding: '16px',
  color: '#ef4444',
  marginBottom: '20px'
}}

// Tailwind equivalent
className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive mb-5"
```

### Accordion Item
```tsx
// Current inline style
style={{ 
  backgroundColor: 'rgba(30, 41, 59, 0.5)',
  borderColor: '#475569'
}}

// Tailwind equivalent
className="bg-secondary/50 border-secondary"
```

### Sticky Header
```tsx
// Current inline style
style={{
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(10px)',
  borderColor: '#475569'
}}

// Tailwind equivalent
className="bg-background/95 backdrop-blur-[10px] border-secondary"
```

### Grid Layout
```tsx
// Current inline style
style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))',
  gap: '24px',
  width: '100%'
}}

// Tailwind equivalent
className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,500px),1fr))] gap-6 w-full"
```

## SpeciesCard.tsx Inline Styles

### Card Container
```tsx
// Current inline style
style={{ 
  backgroundColor: 'rgba(30, 41, 59, 0.9)',
  border: '1px solid #475569',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
}}

// Tailwind equivalent
className="bg-card/90 border border-border rounded-lg overflow-hidden shadow-md"
```

### Badge Style
```tsx
// Current inline style
const badgeStyle = {
  padding: '4px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  display: 'inline-block'
};

// Tailwind equivalent
className="px-3 py-1 rounded-2xl text-xs inline-block"
```

## CategoryGenusPicker.tsx Inline Styles

### Button Style
```tsx
// Current inline style
style={{
  backgroundColor: 'rgba(30, 41, 59, 0.9)',
  border: '1px solid #475569',
  color: '#e2e8f0'
}}

// Tailwind equivalent
className="bg-secondary/90 border-secondary text-secondary-foreground"
```

### Popover Content
```tsx
// Current inline style
style={{ 
  maxHeight: '400px', 
  overflow: 'auto',
  backgroundColor: '#1e293b',
  border: '1px solid #475569',
  zIndex: 9999
}}

// Tailwind equivalent
className="max-h-[400px] overflow-auto bg-secondary border-secondary z-[9999]"
```

## Common Patterns

1. **Dark backgrounds**: Use `bg-background`, `bg-card`, or `bg-secondary`
2. **Text colors**: Use `text-foreground`, `text-muted-foreground`, `text-card-foreground`
3. **Borders**: Use `border-border` or `border-secondary`
4. **Opacity**: Use Tailwind's opacity modifiers like `/90`, `/50`, etc.
5. **Spacing**: Use standard Tailwind spacing utilities (p-4, m-5, etc.)
6. **Shadows**: Use Tailwind shadow utilities instead of custom box-shadow