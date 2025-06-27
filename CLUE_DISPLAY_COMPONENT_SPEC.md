# ClueDisplay Component Specification

## Component Overview
The ClueDisplay component is a Phaser 3 Rex UI-based tabbed interface that replaces the React ClueDisplay component. It displays species clues in a game-integrated format with anonymized species tabs and dynamic clue tables.

## Visual Design Requirements

### Species Tabs (Left Side)
- **Layout**: Vertical tabs on the left side of the component
- **Labels**: Anonymized as "SP1", "SP2", "SP3", etc. (Species 1 → SP1)
- **Styling**: Rounded left corners, consistent with game's brown color scheme
- **States**: Normal, hover, active, completed
- **Behavior**: Click to switch between species data

### Clue Table (Main Panel)
- **Layout**: Single-column grid table (converted from 2-column example)
- **Cells**: Dynamic height based on clue text length
- **Content**: Gem-colored indicator dot + clue text
- **Scrolling**: Vertical scrolling for multiple clues
- **Animation**: Smooth transitions when switching species

### Color Scheme
```typescript
const UI_COLORS = {
    MAIN: 0x4e342e,      // Primary UI background (brown)
    LIGHT: 0x7b5e57,     // Highlight/hover color (light brown)
    DARK: 0x260e04,      // Shadow/border color (dark brown)
    ACCENT: 0x4a90e2,    // Accent elements (blue)
    TEXT: 0xffffff,      // Primary text color (white)
    TEXT_SECONDARY: 0xe0e0e0  // Secondary text color (light gray)
};
```

## Data Structure Specifications

### Core Interfaces
```typescript
interface SpeciesClueData {
    speciesId: number;           // Unique species identifier
    speciesIndex: number;        // For SP1, SP2 numbering (1-based)
    speciesName: string;         // Original species name (for internal use)
    clues: ClueData[];          // Array of revealed clues
    isActive: boolean;          // Currently selected species
    isCompleted: boolean;       // All clues revealed for this species
    totalClues: number;         // Expected number of clues
}

interface ClueTableEntry {
    id: string;                 // Unique identifier for the clue
    gemColor: GemType;          // Color of the gem that revealed this clue
    gemColorHex: number;        // Hex color value for UI display
    clueText: string;           // The actual clue content
    category: GemCategory;      // Clue category (habitat, behavior, etc.)
    categoryIcon: string;       // Emoji icon for the category
    cellHeight: number;         // Calculated height for this cell
    timestamp: number;          // When this clue was revealed
}

interface ClueDisplayState {
    currentSpeciesId: number;           // Active species
    speciesData: Map<number, SpeciesClueData>;  // All species data
    totalSpecies: number;               // Total number of species at location
    allSpeciesCompleted: boolean;       // Game completion state
    isLoadingClue: boolean;            // Show loading state
}
```

### Gem Color Mapping
```typescript
const GEM_UI_COLORS: Record<GemType, number> = {
    red: 0xff4444,        // Slightly muted red
    green: 0x44ff44,      // Slightly muted green  
    blue: 0x4444ff,       // Slightly muted blue
    orange: 0xff8844,     // Orange
    white: 0xffffff,      // White
    black: 0x444444,      // Dark gray (instead of pure black)
    yellow: 0xffff44,     // Slightly muted yellow
    purple: 0xaa44ff      // Purple
};

// Map gem types to categories for proper color display
const getGemTypeForCategory = (category: GemCategory): GemType => {
    switch (category) {
        case GemCategory.CLASSIFICATION: return 'red';
        case GemCategory.HABITAT: return 'green';
        case GemCategory.GEOGRAPHIC: return 'blue';
        case GemCategory.MORPHOLOGY: return 'orange';
        case GemCategory.BEHAVIOR: return 'white';
        case GemCategory.LIFE_CYCLE: return 'black';
        case GemCategory.CONSERVATION: return 'yellow';
        case GemCategory.KEY_FACTS: return 'purple';
        default: return 'white';
    }
};
```

## Component Architecture

### Main Scene Class
```typescript
export class ClueDisplayScene extends Phaser.Scene {
    // UI Components
    private tabs!: RexTabs;
    private gridTable!: RexGridTable;
    private speciesButtons: RexLabel[] = [];
    
    // Data Management
    private speciesData: Map<number, SpeciesClueData> = new Map();
    private currentSpeciesId: number = 0;
    private totalSpecies: number = 0;
    
    // UI State
    private isInitialized: boolean = false;
    private loadingIndicator?: Phaser.GameObjects.Container;
    
    constructor() {
        super({ key: 'ClueDisplayScene' });
    }
    
    create() {
        this.setupEventListeners();
        this.createUI();
        this.initializeState();
    }
    
    // Core methods to be implemented
    private setupEventListeners(): void;
    private createUI(): void;
    private initializeState(): void;
    private handleClueRevealed(clueData: ClueData): void;
    private handleNewGame(gameData: any): void;
    private switchSpecies(speciesIndex: number): void;
    private updateClueTable(): void;
    private calculateCellHeight(text: string, width: number): number;
}
```

### UI Creation Methods
```typescript
private createUI(): void {
    this.tabs = this.rexUI.add.tabs({
        x: 400,
        y: 300,
        panel: this.createGridTable(),
        leftButtons: [], // Will be populated dynamically
        space: {
            leftButtonsOffset: 20,
            leftButton: 2
        }
    });
    
    this.tabs.layout();
    this.setupTabEvents();
}

private createGridTable(): RexGridTable {
    this.gridTable = this.rexUI.add.gridTable({
        background: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, UI_COLORS.MAIN),
        table: {
            width: 350,
            height: 450,
            cellWidth: 330,
            cellHeight: 1, // Will be set dynamically
            columns: 1,
            mask: { padding: 4 }
        },
        slider: {
            track: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, UI_COLORS.DARK),
            thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 13, UI_COLORS.LIGHT)
        },
        createCellContainerCallback: this.createClueCell.bind(this)
    });
    
    this.setupGridTableEvents();
    return this.gridTable;
}
```

## Cell Configuration Specifications

### Dynamic Cell Height Calculation
```typescript
private calculateCellHeight(text: string, maxWidth: number): number {
    const PADDING = 20;
    const MIN_HEIGHT = 50;
    const MAX_HEIGHT = 150;
    const LINE_HEIGHT = 18;
    const CHARS_PER_LINE = Math.floor(maxWidth / 8); // Approximate
    
    const lines = Math.ceil(text.length / CHARS_PER_LINE);
    const textHeight = lines * LINE_HEIGHT;
    const totalHeight = textHeight + PADDING;
    
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, totalHeight));
}
```

### Cell Creation Specification
```typescript
private createClueCell(cell: any): RexLabel {
    const scene = cell.scene;
    const width = cell.width;
    const item: ClueTableEntry = cell.item;
    const height = item.cellHeight;
    
    // Create colored gem indicator
    const gemIndicator = scene.rexUI.add.roundRectangle(
        0, 0, 24, 24, 12, item.gemColorHex
    ).setStrokeStyle(2, UI_COLORS.LIGHT);
    
    // Create text with proper wrapping
    const clueText = scene.add.text(0, 0, item.clueText, {
        fontSize: '14px',
        color: '#ffffff',
        wordWrap: { 
            width: width - 60,
            useAdvancedWrap: true 
        },
        lineSpacing: 2
    });
    
    // Create cell container
    return scene.rexUI.add.label({
        width: width,
        height: height,
        background: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 8, UI_COLORS.MAIN)
            .setStrokeStyle(1, UI_COLORS.DARK)
            .setAlpha(0.9),
        icon: gemIndicator,
        text: clueText,
        space: {
            left: 15,
            right: 15,
            top: 10,
            bottom: 10,
            icon: 12
        },
        align: 'left'
    });
}
```

### Species Button Specification
```typescript
private createSpeciesButton(speciesIndex: number, isCompleted: boolean = false): RexLabel {
    const buttonText = `SP${speciesIndex}`;
    const backgroundColor = isCompleted ? UI_COLORS.ACCENT : UI_COLORS.DARK;
    const textColor = isCompleted ? '#ffffff' : '#cccccc';
    
    return this.rexUI.add.label({
        width: 70,
        height: 45,
        background: this.rexUI.add.roundRectangle(0, 0, 70, 45, {
            tl: 22,
            bl: 22,
            tr: 0,
            br: 0
        }, backgroundColor),
        text: this.add.text(0, 0, buttonText, {
            fontSize: '16px',
            fontWeight: 'bold',
            color: textColor
        }),
        space: { 
            left: 10,
            right: 10 
        }
    });
}
```

## Event Handling Specifications

### EventBus Integration
```typescript
private setupEventListeners(): void {
    // Incoming events from the game
    EventBus.on('clue-revealed', this.handleClueRevealed, this);
    EventBus.on('new-game-started', this.handleNewGame, this);
    EventBus.on('species-completed', this.handleSpeciesCompleted, this);
    EventBus.on('all-species-completed', this.handleAllSpeciesCompleted, this);
    EventBus.on('game-reset', this.handleGameReset, this);
    EventBus.on('no-species-found', this.handleNoSpeciesFound, this);
}

private handleClueRevealed(clueData: ClueData): void {
    const speciesData = this.speciesData.get(clueData.speciesId);
    if (!speciesData) return;
    
    // Create clue table entry
    const clueEntry: ClueTableEntry = {
        id: `${clueData.speciesId}_${clueData.category}_${Date.now()}`,
        gemColor: getGemTypeForCategory(clueData.category),
        gemColorHex: GEM_UI_COLORS[getGemTypeForCategory(clueData.category)],
        clueText: clueData.clue,
        category: clueData.category,
        categoryIcon: this.getCategoryIcon(clueData.category),
        cellHeight: this.calculateCellHeight(clueData.clue, 270),
        timestamp: Date.now()
    };
    
    // Add to species data and update UI
    speciesData.clues.push(clueData);
    this.updateClueTable();
    
    // Show loading state briefly
    this.showClueLoadingAnimation(clueEntry);
}
```

### Tab Interaction Handling
```typescript
private setupTabEvents(): void {
    this.tabs.on('button.click', (button: RexLabel, groupName: string, index: number) => {
        if (groupName === 'left') {
            this.switchSpecies(index + 1); // Convert 0-based to 1-based
            this.highlightActiveTab(button, index);
            
            // Emit event for other components
            EventBus.emit('species-tab-selected', {
                speciesIndex: index + 1,
                speciesId: this.getSpeciesIdFromIndex(index + 1)
            });
        }
    }, this);
}

private highlightActiveTab(activeButton: RexLabel, activeIndex: number): void {
    // Reset all buttons to normal state
    this.speciesButtons.forEach((button, index) => {
        const isActive = index === activeIndex;
        const isCompleted = this.isSpeciesCompleted(index + 1);
        
        const backgroundColor = isActive ? UI_COLORS.ACCENT : 
                              isCompleted ? UI_COLORS.LIGHT : UI_COLORS.DARK;
        
        button.getElement('background').setFillStyle(backgroundColor);
    });
}
```

## Animation Specifications

### Clue Loading Animation
```typescript
private showClueLoadingAnimation(clueEntry: ClueTableEntry): void {
    // Create temporary loading indicator
    const loadingContainer = this.add.container(400, 350);
    
    const loadingBg = this.add.rectangle(0, 0, 300, 60, UI_COLORS.ACCENT, 0.8)
        .setStrokeStyle(2, UI_COLORS.LIGHT);
    
    const loadingText = this.add.text(0, 0, 'Processing clue...', {
        fontSize: '14px',
        color: '#ffffff'
    }).setOrigin(0.5);
    
    const loadingSpinner = this.add.graphics()
        .lineStyle(3, UI_COLORS.LIGHT)
        .beginPath()
        .arc(0, 0, 12, 0, Math.PI * 1.5)
        .strokePath();
    
    loadingContainer.add([loadingBg, loadingText, loadingSpinner]);
    
    // Animate spinner
    this.tweens.add({
        targets: loadingSpinner,
        rotation: Math.PI * 2,
        duration: 1000,
        repeat: -1
    });
    
    // Remove after delay
    this.time.delayedCall(1500, () => {
        loadingContainer.destroy();
        this.updateClueTable();
    });
}
```

### Species Completion Animation
```typescript
private animateSpeciesCompletion(speciesIndex: number): void {
    const button = this.speciesButtons[speciesIndex - 1];
    if (!button) return;
    
    // Pulse animation
    this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
            // Update button appearance
            button.getElement('background').setFillStyle(UI_COLORS.ACCENT);
            
            // Add completion indicator
            const checkmark = this.add.text(0, 0, '✓', {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            button.add(checkmark);
        }
    });
}
```

## Responsive Design Specifications

### Screen Size Adaptation
```typescript
private updateLayoutForScreenSize(): void {
    const gameWidth = this.scale.gameSize.width;
    const gameHeight = this.scale.gameSize.height;
    
    // Adjust component sizes based on screen size
    const isSmallScreen = gameWidth < 800 || gameHeight < 600;
    const tabsWidth = isSmallScreen ? gameWidth * 0.9 : 600;
    const tabsHeight = isSmallScreen ? gameHeight * 0.8 : 500;
    
    if (this.tabs) {
        this.tabs.setSize(tabsWidth, tabsHeight);
        this.tabs.layout();
    }
    
    // Adjust font sizes for readability
    const fontSize = isSmallScreen ? '12px' : '14px';
    this.updateTextSizes(fontSize);
}

private updateTextSizes(fontSize: string): void {
    // Update all text elements to new size
    this.children.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Text) {
            child.setFontSize(fontSize);
        }
    });
}
```

## Performance Optimization Specifications

### Memory Management
```typescript
shutdown(): void {
    // Clean up event listeners
    EventBus.off('clue-revealed', this.handleClueRevealed, this);
    EventBus.off('new-game-started', this.handleNewGame, this);
    EventBus.off('species-completed', this.handleSpeciesCompleted, this);
    EventBus.off('all-species-completed', this.handleAllSpeciesCompleted, this);
    EventBus.off('game-reset', this.handleGameReset, this);
    
    // Destroy UI components
    if (this.tabs) {
        this.tabs.destroy();
    }
    
    // Clear data structures
    this.speciesData.clear();
    this.speciesButtons.length = 0;
    
    super.shutdown();
}
```

### Efficient Cell Rendering
```typescript
private optimizeCellRendering(): void {
    // Only render visible cells to improve performance
    this.gridTable.on('cellvisible', (cell: any) => {
        if (!cell.container) {
            cell.container = this.createClueCell(cell);
        }
    });
    
    this.gridTable.on('cellinvisible', (cell: any) => {
        if (cell.container) {
            cell.container.setVisible(false);
        }
    });
}
```

## Testing Specifications

### Unit Test Requirements
```typescript
describe('ClueDisplayScene', () => {
    let scene: ClueDisplayScene;
    
    beforeEach(() => {
        scene = new ClueDisplayScene();
        // Mock Phaser scene initialization
    });
    
    test('should create species tabs dynamically', () => {
        scene.initializeWithSpeciesCount(3);
        expect(scene.speciesButtons.length).toBe(3);
    });
    
    test('should calculate cell height correctly', () => {
        const shortText = 'Short clue';
        const longText = 'This is a very long clue that should wrap to multiple lines and increase the cell height accordingly';
        
        const shortHeight = scene.calculateCellHeight(shortText, 300);
        const longHeight = scene.calculateCellHeight(longText, 300);
        
        expect(longHeight).toBeGreaterThan(shortHeight);
    });
    
    test('should handle clue revealed events', () => {
        const mockClue: ClueData = {
            category: GemCategory.HABITAT,
            heading: 'Test Species',
            clue: 'Lives in forests',
            speciesId: 1
        };
        
        scene.handleClueRevealed(mockClue);
        expect(scene.getSpeciesData(1).clues.length).toBe(1);
    });
});
```

### Integration Test Requirements
- EventBus communication with game scenes
- UI responsiveness across different screen sizes
- Proper cleanup when switching between scenes
- Data persistence during scene transitions

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create ClueDisplayScene class with proper inheritance
- [ ] Set up Rex UI plugin integration
- [ ] Implement basic tab layout structure
- [ ] Create species button generation system
- [ ] Set up grid table with single-column layout

### Phase 2: Data Integration  
- [ ] Implement EventBus event listeners
- [ ] Create clue data mapping and storage
- [ ] Add gem color coordination system
- [ ] Implement dynamic cell height calculation
- [ ] Set up species state management

### Phase 3: UI Implementation
- [ ] Create clue cell rendering with gem indicators
- [ ] Implement tab switching functionality
- [ ] Add loading states and animations
- [ ] Create completion status indicators
- [ ] Implement scrolling behavior

### Phase 4: Interaction & Animation
- [ ] Add click handlers for tabs and cells
- [ ] Implement smooth transitions between species
- [ ] Create clue reveal animations
- [ ] Add completion celebration effects
- [ ] Implement hover states and feedback

### Phase 5: Polish & Optimization
- [ ] Add responsive design for different screen sizes
- [ ] Optimize rendering performance
- [ ] Implement proper memory management
- [ ] Add error handling and edge cases
- [ ] Create comprehensive test suite

### Phase 6: Integration & Testing
- [ ] Replace React ClueDisplay component
- [ ] Update parent components to use Phaser scene
- [ ] Test cross-component communication
- [ ] Verify game flow integration
- [ ] Performance testing and optimization