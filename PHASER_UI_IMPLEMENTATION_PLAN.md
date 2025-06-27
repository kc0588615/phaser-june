# Phaser 3 Rex UI Tabbed ClueDisplay Implementation Plan

## Overview
Replace the React-based ClueDisplay component with a native Phaser 3 Rex UI tabbed interface that displays species clues in a more integrated game UI format.

## Phase 1: Setup Rex UI Plugin

### 1.1 Install Rex UI Plugin
- Add Rex UI plugin to the project dependencies
- Import required UI components (tabs, gridTable)
- Configure Phaser game config to include Rex UI plugin

### 1.2 Plugin Configuration
```javascript
// In main Phaser config
plugins: {
    scene: [{
        key: 'rexUI',
        plugin: UIPlugin,
        mapping: 'rexUI'
    }]
}
```

### 1.3 Required Plugin Files
```javascript
import UIPlugin from 'phaser3-rex-plugins/plugins/ui-plugin.js';
// Or direct imports for specific components:
import GridTablePlugin from 'phaser3-rex-plugins/plugins/gridtable-plugin.js';
```

## Phase 2: Create ClueDisplayScene

### 2.1 New Phaser Scene Class
- Create `src/game/scenes/ClueDisplayScene.ts`
- Extend Phaser.Scene with Rex UI integration
- Implement scene lifecycle methods

### 2.2 Species Tab Configuration
- Left-side tabs showing "SP1", "SP2", "SP3", etc.
- Anonymized species names (Species 1 → SP1)
- Dynamic tab creation based on discovered species count

### 2.3 Grid Table Setup
- Single column layout (changed from 2-column example)
- Dynamic cell height based on clue text length
- Scrollable container for multiple clues

### 2.4 Scene Structure
```typescript
export class ClueDisplayScene extends Phaser.Scene {
    private tabs: any; // Rex UI tabs component
    private speciesData: Map<number, SpeciesClueData>;
    private currentSpeciesId: number;
    
    constructor() {
        super({ key: 'ClueDisplayScene' });
    }
    
    create() {
        this.setupEventListeners();
        this.createTabsInterface();
        this.setupInteractions();
    }
}
```

## Phase 3: Data Integration

### 3.1 EventBus Communication
- Maintain existing EventBus pattern
- Listen for clue-revealed events
- Handle species switching events

### 3.2 Event Handlers
```typescript
// Listen for game events
EventBus.on('clue-revealed', this.handleClueRevealed, this);
EventBus.on('new-game-started', this.handleNewGame, this);
EventBus.on('species-completed', this.handleSpeciesCompleted, this);
```

### 3.3 Clue Data Mapping
- Use existing `ClueData` interface
- Map gem types to colored dots
- Integrate with `gemCategoryMapping`

### 3.4 Color Coordination
```typescript
// Gem color to UI color mapping
const GEM_UI_COLORS: Record<GemType, number> = {
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    orange: 0xffa500,
    white: 0xffffff,
    black: 0x000000,
    yellow: 0xffff00,
    purple: 0x800080
};
```

## Phase 4: UI Implementation Details

### 4.1 Tab Component Structure
```javascript
const tabs = this.rexUI.add.tabs({
    x: 400, y: 300,
    panel: this.createGridTable(),
    leftButtons: this.createSpeciesButtons(),
    space: { 
        leftButtonsOffset: 20,
        leftButton: 1
    }
});
```

### 4.2 Grid Table Configuration
```javascript
createGridTable() {
    return this.rexUI.add.gridTable({
        background: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, COLOR_MAIN),
        table: {
            width: 300,
            height: 400,
            cellWidth: 280,
            cellHeight: 60, // Base height, will be dynamic
            columns: 1,
            mask: { padding: 2 }
        },
        slider: {
            track: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, COLOR_DARK),
            thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 13, COLOR_LIGHT)
        },
        createCellContainerCallback: this.createClueCell.bind(this)
    });
}
```

### 4.3 Dynamic Cell Creation
```typescript
createClueCell(cell: any) {
    const scene = cell.scene;
    const width = cell.width;
    const item = cell.item; // ClueData object
    
    // Calculate height based on text content
    const textHeight = this.calculateTextHeight(item.clue, width - 40);
    const cellHeight = Math.max(60, textHeight + 20);
    
    return scene.rexUI.add.label({
        width: width,
        height: cellHeight,
        background: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 0)
            .setStrokeStyle(2, COLOR_DARK),
        icon: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10, 
            GEM_UI_COLORS[this.getGemTypeForCategory(item.category)]),
        text: scene.add.text(0, 0, item.clue, {
            fontSize: '14px',
            wordWrap: { width: width - 60 }
        }),
        space: {
            icon: 10,
            left: 15,
            top: 10,
            bottom: 10
        }
    });
}
```

### 4.4 Species Button Creation
```typescript
createSpeciesButtons(): any[] {
    const buttons = [];
    for (let i = 1; i <= this.totalSpecies; i++) {
        buttons.push(this.createSpeciesButton(`SP${i}`, i));
    }
    return buttons;
}

createSpeciesButton(text: string, speciesIndex: number) {
    return this.rexUI.add.label({
        width: 60,
        height: 40,
        background: this.rexUI.add.roundRectangle(0, 0, 50, 50, {
            tl: 20, bl: 20
        }, COLOR_DARK),
        text: this.add.text(0, 0, text, {
            fontSize: '14pt',
            color: '#ffffff'
        }),
        space: { left: 10 }
    });
}
```

## Phase 5: Integration Steps

### 5.1 React Component Updates
- Modify main game component to include ClueDisplayScene
- Update PhaserGame component to manage the new scene
- Handle scene lifecycle and data persistence

### 5.2 Scene Management
```typescript
// In main.ts or PhaserGame component
const config: Phaser.Types.Core.GameConfig = {
    // ... existing config
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        ClueDisplayScene, // Add new scene
        GameOver
    ]
};
```

### 5.3 Communication Bridge
```typescript
// In PhaserGame component
useEffect(() => {
    if (phaserRef.current?.scene) {
        const clueScene = phaserRef.current.scene.getScene('ClueDisplayScene');
        if (clueScene) {
            // Initialize scene with current data
            clueScene.initializeWithData(speciesData);
        }
    }
}, [speciesData]);
```

### 5.4 Responsive Design
- Ensure UI scales properly with game viewport
- Handle different screen sizes and orientations
- Maintain readability across devices

## Technical Requirements

### Dependencies
```json
{
  "phaser3-rex-plugins": "^1.60.0"
}
```

### File Structure
```
src/
├── game/
│   ├── scenes/
│   │   ├── ClueDisplayScene.ts
│   │   └── ...existing scenes
│   ├── ui/
│   │   ├── ClueTableComponent.ts
│   │   ├── SpeciesTabComponent.ts
│   │   └── UIConstants.ts
│   └── types/
│       └── RexUITypes.ts
```

### TypeScript Configuration
```typescript
// types/RexUITypes.ts
declare global {
    namespace Phaser {
        namespace GameObjects {
            interface GameObjectFactory {
                rexUI: {
                    add: {
                        tabs: (config: any) => any;
                        gridTable: (config: any) => any;
                        label: (config: any) => any;
                        roundRectangle: (x: number, y: number, w: number, h: number, r: number | object, color?: number) => any;
                    };
                };
            }
        }
    }
}
```

## Testing Strategy

### Unit Tests
- Test clue data mapping functions
- Verify gem color mapping
- Test text height calculation utilities

### Integration Tests
- EventBus communication between React and Phaser
- Scene lifecycle management
- Data persistence across scene switches

### Visual Tests
- UI responsiveness across screen sizes
- Color accuracy and contrast
- Text readability and wrapping

### User Interaction Tests
- Tab switching functionality
- Scroll behavior in clue table
- Touch/click responsiveness

## Performance Considerations

### Memory Management
- Properly dispose of Rex UI components
- Clean up event listeners on scene shutdown
- Optimize texture usage for colored dots

### Rendering Optimization
- Use object pooling for frequently created/destroyed elements
- Minimize texture swaps
- Batch similar rendering operations

### Data Handling
- Implement efficient data structures for species/clue storage
- Lazy loading of clue content
- Optimize text rendering for long clues

## Migration Strategy

### Phase A: Parallel Implementation
1. Implement ClueDisplayScene alongside existing React component
2. Add toggle mechanism to switch between implementations
3. Test thoroughly in both modes

### Phase B: Data Bridge
1. Ensure both components receive identical data
2. Verify UI behavior matches between implementations
3. Gather user feedback on the new interface

### Phase C: Full Migration
1. Remove React ClueDisplay component
2. Update all references to use Phaser scene
3. Clean up unused React-specific code

### Phase D: Polish and Optimization
1. Fine-tune UI animations and interactions
2. Optimize performance based on usage patterns
3. Add any missing features from original component

## Rollback Plan

### Preparation
- Keep original ClueDisplay.tsx in version control
- Maintain configuration flag to switch implementations
- Document all integration points

### Rollback Triggers
- Performance issues with Rex UI implementation
- Critical bugs that block game functionality
- User experience significantly worse than React version

### Rollback Process
1. Re-enable React component via configuration
2. Disable Phaser scene initialization
3. Restore original EventBus event handling
4. Test all game functionality with reverted changes