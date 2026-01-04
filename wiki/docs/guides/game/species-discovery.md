---
sidebar_position: 2
title: Species Discovery Flow
description: How players progress through species identification
tags: [guide, game-logic, species]
---

# Species Discovery Implementation

How the game manages species progression and player discovery.

## Overview

When a player clicks a location:
1. Query returns multiple species at that location
2. Species are queued for sequential discovery
3. Player reveals clues → submits guess → advances to next species

## Species Queue Management

```typescript
// Game.ts
private speciesQueue: Species[] = [];
private currentSpeciesIndex: number = 0;

private initializeBoardFromCesium(data: LocationData) {
  this.speciesQueue = data.species;
  this.currentSpeciesIndex = 0;
  this.startNextSpecies();
}

private startNextSpecies() {
  if (this.currentSpeciesIndex >= this.speciesQueue.length) {
    EventBus.emit('all-species-completed', {
      totalSpecies: this.speciesQueue.length
    });
    return;
  }

  const species = this.speciesQueue[this.currentSpeciesIndex];
  this.selectedSpecies = species;

  EventBus.emit('new-game-started', {
    speciesName: 'Mystery Species',
    speciesId: species.id,
    totalSpecies: this.speciesQueue.length,
    currentIndex: this.currentSpeciesIndex,
    hiddenSpeciesName: species.common_name
  });
}
```

## Guess Validation

```typescript
private handleSpeciesGuess(data: GuessPayload) {
  const correct = data.guessedName.toLowerCase() ===
    this.selectedSpecies.common_name.toLowerCase();

  if (correct) {
    this.recordDiscovery(this.selectedSpecies.id);
    this.currentSpeciesIndex++;
    this.startNextSpecies();
  }
}
```

## Player Tracking Integration

Discoveries are recorded to Supabase for stats:

```typescript
async function recordDiscovery(speciesId: number) {
  await supabase.rpc('record_species_discovery', {
    p_session_id: currentSessionId,
    p_species_id: speciesId,
    p_guess_count: guessAttempts
  });
}
```

## Related

- [Clue Board Implementation](/docs/guides/game/clue-board)
- [Player Tracking](/docs/guides/player/tracking-implementation)
