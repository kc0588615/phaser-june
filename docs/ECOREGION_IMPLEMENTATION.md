# Ecoregion Implementation Documentation

## Overview
This document details the implementation of ecoregion-based filtering and navigation functionality for the species database in the Phaser June project. The implementation allows users to filter species by ecoregion, realm, and biome while maintaining existing category/genus navigation.

## Implementation Summary

### What Was Built
- **Smart Filtering System**: Users can filter the entire species dataset by ecoregion, realm, or biome
- **Unified Navigation**: Single dropdown control for both navigation (category/genus) and filtering (ecoregion/realm/biome)
- **Visual Feedback**: Clear indicators showing active filters and species counts
- **Dark Theme Support**: All components styled for the existing dark theme

### Key Features
1. **Multi-type Navigation**: Supports 5 different navigation/filter types
2. **Searchable Dropdown**: Users can type to find options quickly
3. **Responsive Design**: Works on mobile and desktop
4. **Real-time Updates**: Species counts update based on active filters

## Files Created

### 1. `/src/utils/ecoregion.ts`
Utility functions for extracting and managing ecoregion data.

**Functions:**
- `getEcoregions(species: Species[]): string[]` (lines 6-15)
  - Extracts unique ecoregions from species array
  - Filters out null/undefined values
  - Returns sorted array of ecoregion names

- `getRealms(species: Species[]): string[]` (lines 20-29)
  - Similar to getEcoregions but for realm field
  
- `getBiomes(species: Species[]): string[]` (lines 34-43)
  - Similar to getEcoregions but for biome field

- `groupSpeciesByCategory(species: Species[]): Record<string, Record<string, Species[]>>` (lines 48-74)
  - Groups species by category (currently all "Turtles")
  - Then groups by genus within each category
  - Sorts species within each genus by common name

### 2. `/src/types/speciesBrowser.ts`
TypeScript type definitions for the species browser.

**Types:**
- `GroupedSpecies` (line 3)
  - Type alias for nested species grouping structure
  - `Record<category, Record<genus, Species[]>>`

- `JumpTarget` (lines 5-10)
  - Union type for different navigation targets
  - Variants:
    - `{ type: "category"; value: string }`
    - `{ type: "genus"; value: { category: string; genus: string } }`
    - `{ type: "ecoregion"; value: string }`
    - `{ type: "realm"; value: string }`
    - `{ type: "biome"; value: string }`

### 3. `/src/components/CategoryGenusPickerFixed.tsx`
The working dropdown component (final version after fixing popover issues).

**Component Props Interface** (lines 13-21):
```typescript
interface CategoryGenusPickerProps {
  grouped: GroupedSpecies;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  selectedFilter: { type: string; value: string } | null;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
}
```

**Key Functions:**
- `handleSelect(currentValue: string): void` (lines 50-66)
  - Parses the selected value to determine action type
  - Calls appropriate onJump handler based on prefix
  - Closes dropdown after selection

- `getDisplayValue(): string` (lines 68-74)
  - Returns display text for button based on current selection
  - Shows filter type and value when active

**State Management:**
- `open: boolean` (line 32) - Controls dropdown visibility
- `dropdownRef: RefObject<HTMLDivElement>` (line 33) - For click-outside detection

**Notable Implementation Details:**
- Custom dropdown instead of Radix Popover (lines 91-216)
- Click-outside handler (lines 36-47)
- Absolute positioning for dropdown (line 90)
- Manual z-index management (line 89)

### 4. `/src/components/CategoryGenusPickerSimple.tsx` (Intermediate version)
Created during debugging but replaced by CategoryGenusPickerFixed.tsx.

### 5. `/src/components/TestPopover.tsx` (Debug component)
Simple test component created to isolate popover issues.

## Files Modified

### 1. `/src/components/SpeciesList.tsx`

**Major Changes:**
- Added imports for new components and utilities (lines 5-10)
- Added state for filter management (line 14)
- Added refs for scroll navigation (lines 16-17)

**New Functions:**
- `filteredSpecies` memo (lines 61-73)
  - Filters species based on selectedFilter state
  - Returns filtered array for display

- `onJump(target: JumpTarget): void` (lines 85-114)
  - Handles both navigation and filtering
  - For filters: Updates selectedFilter state
  - For navigation: Scrolls to element using refs

- `onClearFilter(): void` (lines 116-118)
  - Resets selectedFilter to null

**UI Structure Changes:**
- Added CategoryGenusPicker component (lines 160-168)
- Wrapped species in ScrollArea component (line 218)
- Changed from simple divs to Accordion components (lines 219-268)
- Added wrapper divs for refs to avoid forwardRef issues (lines 221, 266)

### 2. `/src/components/SpeciesCard.tsx`

**Observations:**
- Already had ecoregion display section (lines 251-288)
- Shows bioregion, realm, sub-realm, and biome fields
- No modifications needed for ecoregion feature

### 3. `/src/lib/speciesService.ts`

**Observations:**
- Already fetches bioregion data (lines 89-91)
- No modifications needed

### 4. `/src/types/database.ts`

**Observations:**
- Species interface already includes ecoregion fields (lines 47-51):
- `bioregion?: string`
  - `realm?: string`
- `subrealm?: string`
  - `biome?: string`
- No modifications needed

## Known Issues

### 1. Popover Positioning Issue (RESOLVED)
- **Issue**: Radix Popover was rendering off-screen with `transform: translate(0px, -200%)`
- **Cause**: Conflict with global CSS `overflow: hidden` on html/body elements
- **Solution**: Created custom dropdown implementation without Radix Popover
- **Files**: Created CategoryGenusPickerFixed.tsx to replace Popover-based versions

### 2. Ref Warning (RESOLVED)
- **Issue**: "Function components cannot be given refs" warning on AccordionItem
- **Cause**: AccordionItem doesn't use React.forwardRef()
- **Solution**: Wrapped AccordionItem in div elements that receive the refs
- **Location**: SpeciesList.tsx lines 221 and 266

### 3. TypeScript Build Errors (PRE-EXISTING)
- Multiple TypeScript errors in unrelated files (CesiumMap.tsx, SpeciesCard.tsx)
- These existed before the ecoregion implementation
- Do not affect the ecoregion functionality

### 4. Limited Test Data
- Currently only turtle species in database
- All marked as category "Turtles"
- Full functionality will be more apparent with diverse species data

## Implementation Flow

### User Interaction Flow:
1. User clicks dropdown button
2. Dropdown opens showing grouped options:
   - Categories with genera nested beneath
   - Ecoregions list
   - Realms list
   - Biomes list
3. User can search or scroll through options
4. Selection triggers different behaviors:
   - **Category/Genus**: Scrolls to that section in accordion
   - **Ecoregion/Realm/Biome**: Filters entire dataset

### Data Flow:
1. `SpeciesList` fetches all species from `/api/species/catalog` (Drizzle)
2. Utility functions extract unique ecoregions/realms/biomes
3. Species are filtered if a filter is active
4. Filtered species are grouped by category/genus
5. Grouped data is passed to both picker and display components

## Future Considerations

### For Future LLMs:
1. **Popover Issues**: If reverting to Radix Popover, check global CSS for conflicts
2. **Performance**: With large datasets, consider virtualizing the species list
3. **Categories**: Code assumes single category per species; may need updates for multiple categories
4. **Search**: Current search is basic; could add fuzzy matching or weighted results
5. **State Management**: Consider lifting filter state higher if needed by other components

### Potential Enhancements:
1. Add multiple filter support (e.g., ecoregion AND realm)
2. Add filter count badges on dropdown groups
3. Implement URL state for shareable filtered views
4. Add animation transitions when filtering
5. Cache filtered results for performance

## Testing Recommendations

1. **Dropdown Functionality**:
   - Verify dropdown opens/closes properly
   - Test keyboard navigation
   - Test search functionality
   - Verify click-outside closes dropdown

2. **Filtering**:
   - Test each filter type (ecoregion, realm, biome)
   - Verify species counts update correctly
   - Test filter removal via X button
   - Verify "no results" state

3. **Navigation**:
   - Test category selection scrolls to section
   - Test genus selection scrolls to subsection
   - Verify accordion expand/collapse works with refs

4. **Edge Cases**:
   - Test with species missing ecoregion data
   - Test with empty search results
   - Test rapid filter changes
   - Test on mobile devices

## Code Style Notes

- Uses inline styles for dark theme compatibility
- Follows existing project patterns for component structure
- Maintains consistency with existing TypeScript usage
- Preserves existing import organization

This implementation provides a solid foundation for ecological filtering while maintaining the existing navigation patterns. The modular design allows for easy extension as more animal categories are added to the database.
