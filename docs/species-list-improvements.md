# Species List UI Improvements Documentation

## Overview
This document details the implementation of three major UI improvements to the Species List page:
1. Replacing the dropdown CategoryGenusPicker with a full-width search input
2. Adding sticky accordion headers that appear when scrolling up
3. Integration with the discovered species feature (showing known vs unknown species)

## Files Modified and Created

### Created Files
1. **`/src/components/SpeciesSearchInput.tsx`**
   - New component replacing the dropdown picker
   - Full-width search input with autocomplete functionality

2. **`/src/components/ui/input.tsx`**
   - shadcn/ui Input component (was missing from project)
   - Basic styled input element wrapper

### Modified Files
1. **`/src/components/SpeciesList.tsx`**
   - Major modifications to add sticky headers and integrate new search
   - Added state management for scroll detection and accordion tracking
   - Created separate `AccordionCategory` component (Lines 16-136)
   - Added discovered species tracking from localStorage

2. **`/src/types/speciesBrowser.ts`**
   - Added 'species' type to JumpTarget union type

## Implementation Details

### 1. Search Input Component (`SpeciesSearchInput.tsx`)

#### Component Props Interface (Lines 9-17)
```typescript
interface SpeciesSearchInputProps {
  grouped: GroupedSpecies;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  species: Species[];  // Added to support individual species search
  selectedFilter: { type: string; value: string } | null;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
}
```

#### Key State Variables (Lines 36-40)
- `searchQuery`: Current search input value
- `showResults`: Boolean controlling dropdown visibility
- `selectedIndex`: Keyboard navigation index
- `inputRef`: Reference to input element
- `resultsRef`: Reference to results dropdown

#### Search Options Building (Lines 43-90)
- Builds searchable options from categories, genera, geographic filters, and individual species
- Creates `SearchOption` objects with type, label, and optional metadata

#### Filtering Logic (Lines 93-103)
- Filters options based on search query
- Case-insensitive matching
- Limits results to 10 items

#### Keyboard Navigation (Lines 146-174)
- Arrow keys for navigation
- Enter to select
- Escape to close
- Updates `selectedIndex` state

#### Click Outside Handler (Lines 106-119)
- Closes dropdown when clicking outside
- Uses mousedown event for better UX

### 2. Species List Modifications (`SpeciesList.tsx`)

#### New AccordionCategory Component (Lines 16-136)
A separate memoized component created to handle each accordion category with its own sticky header logic:

```typescript
const AccordionCategory = memo(({ 
  category, 
  genera, 
  isOpen, 
  showStickyHeaders,
  onToggle,
  setRef,
  discoveredSpecies
}: {
  category: string;
  genera: Record<string, Species[]>;
  isOpen: boolean;
  showStickyHeaders: boolean;
  onToggle: () => void;
  setRef: (id: string) => (el: HTMLDivElement | null) => void;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
}) => {
```

Key features:
- Uses `IntersectionObserver` to detect when original header is visible
- Manages sticky header visibility with local state
- Prevents empty space issues by using `hidden` class
- Passes discovered species information to SpeciesCard components

#### New State Variables (Lines 143-150)
```typescript
const [openAccordions, setOpenAccordions] = useState<string[]>([]);
const [showStickyHeaders, setShowStickyHeaders] = useState(false);
const [discoveredSpecies, setDiscoveredSpecies] = useState<Record<number, { name: string; discoveredAt: string }>>({});
const lastScrollTop = useRef(0);
const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
```

#### Discovered Species Management (Lines 157-199)
- Loads discovered species from localStorage on component mount
- Listens for storage changes and custom 'species-discovered' events
- Updates discovered species display in real-time across tabs

#### Scroll Detection Logic (Lines 201-242)
```typescript
const handleScroll = () => {
  const currentScrollTop = scrollContainer.scrollTop;
  
  // Clear existing timeout
  if (scrollTimeout.current) {
    clearTimeout(scrollTimeout.current);
  }

  // Detect scroll direction with a threshold to prevent jitter
  const scrollDelta = currentScrollTop - lastScrollTop.current;
  
  if (scrollDelta < -5 && currentScrollTop > 200) {
    // Scrolling up with threshold and not near top
    setShowStickyHeaders(true);
  } else if (scrollDelta > 5) {
    // Scrolling down with threshold
    setShowStickyHeaders(false);
  }

  lastScrollTop.current = currentScrollTop;
```
- Uses 5px threshold to prevent jittery behavior
- Only shows headers when > 200px from top
- Properly updates `lastScrollTop.current` ref
- Hides headers after 2 seconds of no scrolling

#### Species Separation (Lines 309-322)
```typescript
const { knownSpecies, unknownSpecies } = useMemo(() => {
  const known: Species[] = [];
  const unknown: Species[] = [];
  
  filteredSpecies.forEach(sp => {
    if (discoveredSpecies[sp.ogc_fid]) {
      known.push(sp);
    } else {
      unknown.push(sp);
    }
  });
  
  return { knownSpecies: known, unknownSpecies: unknown };
}, [filteredSpecies, discoveredSpecies]);
```
- Separates species into "Discovered" and "Unknown" categories
- Uses localStorage data to determine discovery status

#### Updated onJump Function (Lines 364-394)
- Added support for 'species' type filter
- Maintains existing category/genus navigation
- Smooth scrolling to filtered results

#### Sticky Header Implementation in AccordionCategory (Lines 61-86)
```typescript
{isOpen && (
  <div 
    className={cn(
      "sticky top-0 z-40 pointer-events-auto",
      hideSticky ? "hidden" : showStickyHeaders ? "block" : "hidden"
    )}
  >
    {/* Sticky header content */}
  </div>
)}
```
- Uses `sticky` positioning within accordion item
- Added `pointer-events-auto` to ensure clickability
- Uses `hidden` class to completely remove from display when not needed
- Prevents empty space by not rendering when original header is visible

#### Intersection Observer Setup (Lines 37-52)
```typescript
const observer = new IntersectionObserver(
  ([entry]) => {
    setHideSticky(entry.isIntersecting);
  },
  {
    threshold: 0.9,
    rootMargin: '-50px 0px 0px 0px'
  }
);
```
- Detects when 90% of original header is visible
- Hides sticky header to prevent duplication

#### Accordion State Tracking (Lines 525-529, 560-564)
```typescript
<Accordion 
  type="multiple" 
  className="w-full space-y-4"
  value={openAccordions}
  onValueChange={setOpenAccordions}
>
```
- Tracks which accordions are open using category names (not prefixed)
- Enables showing sticky headers only for open sections
- Separate accordions for "Discovered" and "Unknown" species sections

### 3. Type Updates (`speciesBrowser.ts`)

#### Extended JumpTarget Type (Line 11)
```typescript
| { type: "species"; value: string }
```
- Added to support individual species selection

## Known Issues and Considerations

1. **Performance**: With large species lists, the search option building could be optimized with memoization
2. **Mobile Keyboard**: On mobile devices, the keyboard may cover search results - could be improved with viewport adjustments
3. **Scroll Behavior**: The scroll detection threshold (5px) may need tuning based on user feedback
4. **Animation Timing**: The 2-second auto-hide for sticky headers might be too long/short for some users
5. **Search Limit**: Currently limited to 10 results - may need pagination for better discovery
6. **Multiple Accordions**: When multiple accordions are open, their sticky headers will stack vertically
7. **Intersection Observer**: The threshold and root margin values may need adjustment for different screen sizes
8. **Discovered Species Sync**: Uses localStorage and window events for cross-tab synchronization

## Component Communication Flow

1. User types in `SpeciesSearchInput`
2. Component filters options and displays dropdown
3. User selects option → `onJump` callback triggered
4. `SpeciesList` receives jump target and updates filter/scroll position
5. Accordion state tracked via `openAccordions` array (using category names)
6. Scroll events trigger sticky header visibility changes
7. `AccordionCategory` uses IntersectionObserver to hide sticky when original is visible
8. Sticky headers use `hidden` class to prevent empty space issues
9. Discovered species data flows from localStorage → component state → SpeciesCard props
10. Cross-tab sync via storage events and custom 'species-discovered' events

## CSS Classes and Styling

### Search Input Styling
- Full width with responsive text size: `text-base sm:text-sm`
- Dark theme colors: `bg-slate-800 border-slate-700`
- Focus states: `focus:ring-2 focus:ring-blue-500`

### Sticky Header Styling
- Semi-transparent background: `bg-slate-800/95`
- Backdrop blur for readability: `backdrop-blur-sm`
- Hidden state: `hidden` class (display: none) to prevent empty space
- Sticky positioning: `sticky top-0 z-40` within accordion content
- Pointer events enabled: `pointer-events-auto` for clickability
- Hover effect: `hover:bg-slate-700/95 transition-colors`

## Future Improvements

1. Add debouncing to search input for better performance
2. Implement virtualization for very large species lists
3. Add search history or recent searches
4. Consider adding fuzzy search for better matching
5. Add accessibility announcements for screen readers
6. Implement touch gestures for mobile accordion control
7. Fine-tune IntersectionObserver thresholds for different viewport sizes
8. Consider alternative to multiple sticky headers when many accordions are open

## Latest Changes Summary

### Sticky Header Architecture Evolution
1. **Initial implementation**: Used duplicate sticky element with CSS transitions
2. **Issue discovered**: Empty space persisted even when sticky header was hidden
3. **First fix attempt**: Changed to fixed positioning, but this caused headers to appear above the tree display
4. **Final solution**: 
   - Reverted to sticky positioning within AccordionItem
   - Created separate `AccordionCategory` component for proper hook usage
   - Used `hidden` class instead of CSS opacity/height tricks
   - IntersectionObserver detects when original header is visible
   - Completely removes sticky header from display when not needed

### Recent Restoration (2025-07-25)
The sticky header feature was accidentally removed and has been restored with the following fixes:
1. **Scroll Detection Fix**: Properly updates `lastScrollTop.current` ref instead of just a local variable
2. **Accordion State Fix**: Uses consistent category names (not prefixed) for tracking open accordions
3. **Integration with Discovered Species**: The feature now works seamlessly with the discovered/unknown species separation

This approach ensures the sticky header appears in the correct position (above species cards) while preventing any empty space issues when scrolling back to the top.