# Species Discovery Feature Implementation

## Overview
This document details the implementation of a species discovery/guessing game feature where players must deduce the identity of a "Mystery Species" by matching gems to reveal clues. The game supports multiple species per location with automatic progression.

## Feature Description
- Species names are hidden from players (displayed as "Mystery Species")
- Players match gems to reveal clues about the species
- A dropdown selector allows players to guess from 10 candidate species
- Correct guesses are celebrated and tracked persistently
- **Multi-species locations**: When multiple species exist at a location:
  - Species are presented one at a time (sorted by ogc_fid)
  - Correct guess advances to next mystery species
  - Last species completion prompts for new location
- Discovered species appear in a "Known" section in the Species List
- Uses localStorage for persistence (ready for future user account migration)

## Files Created

### 1. `/src/components/SpeciesGuessSelector.tsx` (250 lines)
A React component that provides the species guessing interface.

**Key Features:**
- Searchable dropdown with 10 species options (line 77-87)
- Tracks incorrect guesses with visual feedback (line 184-217)
- Integrates with EventBus for game state communication (line 131-141)
- Automatically includes the correct answer in the options (line 82-84)

**Main Functions:**
- `loadCandidateSpecies()` (line 74-116): Fetches random species names and ensures correct answer is included
- `handleGuessSubmit()` (line 118-142): Processes guess attempts and emits results
- `handleNewGame()` (line 41-51): Resets component state for new species

**State Variables:**
- `candidateSpecies`: Array of species names to choose from
- `guessedSpecies`: Set tracking already-guessed species
- `hiddenSpeciesName`: The actual species name to guess
- `isCorrect`: Whether the current guess is correct

## Files Modified

### 1. `/src/game/scenes/Game.ts`
Modified to hide species names and implement multi-species progression.

**Changes:**
- Line 191-198: Modified `new-game-started` event to emit "Mystery Species" instead of actual name
- Line 681-687: Same modification for when advancing to next species
- Added `hiddenSpeciesName` property to event payload containing the real species name
- **New Game Loop Features:**
  - Added `handleSpeciesGuess()` method to process guess validation
  - Modified `advanceToNextSpecies()` to progress through species queue
  - Added `resetForNewLocation()` to clear state when all species discovered
  - Removed auto-advance on all clues revealed (waits for player guess)
  - Tracks species progression with `currentSpeciesIndex`

### 2. `/src/game/EventBus.ts`
Updated type definitions for new events.

**Changes:**
- Line 30: Added optional `hiddenSpeciesName` to `new-game-started` event
- Line 43-48: Added new `species-guess-submitted` event type with guess result data

### 3. `/src/components/SpeciesPanel.tsx`
Main panel component that coordinates the species display and discovery tracking.

**Changes:**
- Line 30: Added `hiddenSpeciesName` state
- Line 74-87: Modified `handleNewGame` to store hidden species name
- Line 127-163: Added `handleSpeciesGuess` function to process correct guesses
  - Shows success toast (line 135-138)
  - Saves to localStorage (line 141-152)
  - Dispatches custom event for Species List updates (line 155-157)
- Line 177: Updated effect dependencies to include `selectedSpeciesId`

### 4. `/src/components/SpeciesHeaderCard.tsx`
Header component showing species information.

**Changes:**
- Line 34-36: Modified to show "🔍 Mystery Species - Match gems to reveal clues!" when species is hidden

### 5. `/src/components/ClueSheetWrapper.tsx`
Wrapper component for the clue sheet that includes the guess selector.

**Changes:**
- Line 8: Added EventBus import
- Line 15: Added `hiddenSpeciesName` prop
- Line 21: Added `isSpeciesDiscovered` state
- Line 23-36: Added listener for guess results
- Line 106-135: Added SpeciesGuessSelector integration
- Line 101: Shows discovered species name with checkmark when guessed

### 6. `/src/lib/speciesService.ts`
Service layer for species data operations.

**Changes:**
- Line 150-234: Added `getRandomSpeciesNames()` function
  - Fetches random species from database
  - Excludes current species from results
  - Falls back to hardcoded list if database fails

### 7. `/src/components/SpeciesList.tsx`
Species list page showing all species.

**Major Changes:**
- Line 141: Added `discoveredSpecies` state
- Line 158-170: Added `loadDiscoveredSpecies()` function
- Line 172-199: Added event listeners for localStorage updates
- Line 272-285: Added separation logic for known/unknown species
- Line 287-316: Added `grouped` variable for combined data
- Line 454-523: Restructured display to show separate "Discovered" and "Unknown" sections
- Line 459 & 495: Added species counts to section headers

### 8. `/src/components/SpeciesCard.tsx`
Individual species card component.

**Changes:**
- Line 18-19: Added `isDiscovered` and `discoveredAt` props
- Line 83-87: Added "✅ Known" badge for discovered species

## Event Flow

1. **Game Start**:
   - `Game.ts` emits `new-game-started` with "Mystery Species" (line 191)
   - `SpeciesPanel` receives event and stores `hiddenSpeciesName` (line 86)
   - `SpeciesGuessSelector` loads candidate species list (line 74)

2. **Player Makes Guess**:
   - Player selects species and clicks "Guess" 
   - `SpeciesGuessSelector` emits `species-guess-submitted` (line 131)
   - `SpeciesPanel` handles guess result (line 127)

3. **Correct Guess**:
   - Success toast shown (line 135)
   - Species saved to localStorage (line 151)
   - Custom `species-discovered` event dispatched (line 155)
   - Species List updates to show in "Discovered" section

4. **Next Species**:
   - Game automatically advances after all clues revealed
   - Process repeats with new mystery species

## Data Storage

### localStorage Structure
```json
{
  "discoveredSpecies": [
    {
      "id": 12345,
      "name": "Green Sea Turtle",
      "discoveredAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

## Known Issues

1. **Single Tab Limitation**: localStorage events don't fire in the same tab, only across tabs. Mitigated with custom events and focus listeners.

2. **State Synchronization**: Multiple rapid discoveries might race condition. Mitigated with proper event handling and state updates.

3. **Species Name Matching**: Currently uses case-insensitive string comparison. Scientific names with special characters might need additional normalization.

## UI/UX Features

1. **Visual Feedback**:
   - Incorrect guesses show with ✗ and strikethrough
   - Remaining guess count displayed
   - Success state shows green checkmark

2. **Progressive Disclosure**:
   - More clues revealed as players match gems
   - Encourages continued gameplay even after wrong guesses

3. **Persistent Progress**:
   - Discovered species remain marked across sessions
   - Species List shows discovery statistics

## Recent Bug Fixes

1. **Duplicate "all-species-completed" Event**:
   - Removed duplicate event emission from `advanceToNextSpecies()`
   - Event now only emitted once from `handleSpeciesGuess()`

2. **Duplicate Congratulations Toast**:
   - Added React ref (`completionToastShownRef`) to track toast display
   - Toast only shows once per location completion
   - Ref resets when starting new location

3. **Premature "All Species Discovered" Display**:
   - Fixed state management to properly track species progression
   - Header now correctly shows "Mystery Species" for subsequent species

## Future Enhancements

1. Add hint system after X incorrect guesses
2. Track guess statistics (attempts, time to discover)
3. Add achievements for discovery milestones
4. Implement difficulty levels with fewer/more candidates
5. Add species comparison feature for discovered species