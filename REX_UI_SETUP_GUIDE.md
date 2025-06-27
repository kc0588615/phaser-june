# Rex UI Plugin Setup Guide

## Overview
This guide provides step-by-step instructions for integrating the Rex UI plugin into the Phaser 3 match-3 puzzle game project.

## Installation Options

### Option 1: NPM Installation (Recommended)
```bash
npm install phaser3-rex-plugins
```

### Option 2: Direct Plugin Files
Download specific UI plugin files from Rex's GitHub repository:
- `ui-plugin.js` - Main UI plugin bundle
- `gridtable-plugin.js` - Grid table component (if using standalone)
- Individual component files as needed

Repository: https://github.com/rexrainbow/phaser3-rex-notes

## Plugin Integration

### Package.json Updates
```json
{
  "dependencies": {
    "phaser3-rex-plugins": "^1.60.0",
    "phaser": "^3.90.0"
  }
}
```

### Main Phaser Config Setup
```typescript
// src/game/main.ts
import UIPlugin from 'phaser3-rex-plugins/plugins/ui-plugin.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-game',
    plugins: {
        scene: [{
            key: 'rexUI',
            plugin: UIPlugin,
            mapping: 'rexUI'
        }]
    },
    scene: [
        // ... your existing scenes
    ]
};
```

### Alternative Configuration (Global Plugin)
```typescript
// For components that need global access
const config: Phaser.Types.Core.GameConfig = {
    // ... other config
    plugins: {
        global: [{
            key: 'rexGridTable',
            plugin: GridTablePlugin,
            start: true
        }],
        scene: [{
            key: 'rexUI',
            plugin: UIPlugin,
            mapping: 'rexUI'
        }]
    }
};
```

## TypeScript Integration

### Type Declarations
Create or update `src/types/phaser-rex.d.ts`:

```typescript
// Rex UI Plugin Type Declarations
declare module 'phaser3-rex-plugins/plugins/ui-plugin.js' {
    const UIPlugin: any;
    export default UIPlugin;
}

declare module 'phaser3-rex-plugins/plugins/gridtable-plugin.js' {
    const GridTablePlugin: any;
    export default GridTablePlugin;
}

// Extend Phaser types
declare global {
    namespace Phaser {
        namespace GameObjects {
            interface GameObjectFactory {
                rexUI: RexUIFactory;
            }
        }
    }
}

interface RexUIFactory {
    add: {
        tabs: (config: TabsConfig) => RexTabs;
        gridTable: (config: GridTableConfig) => RexGridTable;
        label: (config: LabelConfig) => RexLabel;
        roundRectangle: (x: number, y: number, width: number, height: number, radius: number | RadiusConfig, color?: number) => RexRoundRectangle;
        sizer: (config: SizerConfig) => RexSizer;
    };
}

// Component-specific interfaces
interface TabsConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    panel?: any;
    leftButtons?: any[];
    rightButtons?: any[];
    topButtons?: any[];
    bottomButtons?: any[];
    space?: {
        leftButtonsOffset?: number;
        rightButtonsOffset?: number;
        topButtonsOffset?: number;
        bottomButtonsOffset?: number;
        leftButton?: number;
        rightButton?: number;
        topButton?: number;
        bottomButton?: number;
    };
}

interface GridTableConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    scrollMode?: 'v' | 'h';
    background?: any;
    table?: {
        width?: number;
        height?: number;
        cellWidth?: number;
        cellHeight?: number;
        columns?: number;
        mask?: {
            padding?: number;
        };
    };
    slider?: {
        track?: any;
        thumb?: any;
    };
    createCellContainerCallback?: (cell: any) => any;
    items?: any[];
}

interface LabelConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    background?: any;
    icon?: any;
    text?: any;
    action?: any;
    space?: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
        icon?: number;
        text?: number;
    };
}

interface RadiusConfig {
    tl?: number;
    tr?: number;
    bl?: number;
    br?: number;
}

// Component interfaces
interface RexTabs {
    layout(): RexTabs;
    on(event: string, callback: Function, context?: any): RexTabs;
    emit(event: string, ...args: any[]): RexTabs;
    emitButtonClick(groupName: string, index: number): RexTabs;
    getElement(name: string): any;
}

interface RexGridTable {
    setItems(items: any[]): RexGridTable;
    scrollToTop(): RexGridTable;
    on(event: string, callback: Function, context?: any): RexGridTable;
}

interface RexLabel {
    text: string;
    getElement(name: string): any;
}

interface RexRoundRectangle {
    setFillStyle(color: number): RexRoundRectangle;
    setStrokeStyle(lineWidth: number, color: number): RexRoundRectangle;
    setDepth(depth: number): RexRoundRectangle;
}

interface RexSizer {
    add(gameObject: any, config?: any): RexSizer;
    layout(): RexSizer;
}
```

### TSConfig Updates
```json
{
  "compilerOptions": {
    "typeRoots": [
      "./node_modules/@types",
      "./src/types"
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Component Usage Examples

### Basic Tabs Component
```typescript
export class ClueDisplayScene extends Phaser.Scene {
    private tabs!: RexTabs;

    create() {
        this.tabs = this.rexUI.add.tabs({
            x: 400,
            y: 300,
            panel: this.createPanel(),
            leftButtons: this.createLeftButtons(),
            space: {
                leftButtonsOffset: 20,
                leftButton: 1
            }
        });

        this.tabs.layout();
        this.setupTabEvents();
    }

    private createPanel() {
        return this.rexUI.add.gridTable({
            background: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, 0x4e342e),
            table: {
                width: 300,
                height: 400,
                cellWidth: 280,
                cellHeight: 60,
                columns: 1,
                mask: { padding: 2 }
            },
            createCellContainerCallback: this.createCell.bind(this)
        });
    }

    private createLeftButtons() {
        return [
            this.createButton('SP1'),
            this.createButton('SP2'),
            this.createButton('SP3')
        ];
    }

    private createButton(text: string) {
        return this.rexUI.add.label({
            width: 60,
            height: 40,
            background: this.rexUI.add.roundRectangle(0, 0, 50, 50, {
                tl: 20,
                bl: 20
            }, 0x260e04),
            text: this.add.text(0, 0, text, {
                fontSize: '14pt',
                color: '#ffffff'
            }),
            space: { left: 10 }
        });
    }

    private setupTabEvents() {
        this.tabs.on('button.click', (button: any, groupName: string, index: number) => {
            if (groupName === 'left') {
                this.handleSpeciesSelection(index);
            }
        });
    }
}
```

### Grid Table with Dynamic Cells
```typescript
private createCell(cell: any) {
    const scene = cell.scene;
    const width = cell.width;
    const height = cell.height;
    const item = cell.item;

    return scene.rexUI.add.label({
        width: width,
        height: height,
        background: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 0)
            .setStrokeStyle(2, 0x260e04),
        icon: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10, item.color),
        text: scene.add.text(0, 0, item.text, {
            fontSize: '14px',
            wordWrap: { width: width - 60 }
        }),
        space: {
            icon: 10,
            left: 15,
            top: 5,
            bottom: 5
        }
    });
}
```

## Next.js Integration Considerations

### Webpack Configuration
Update `next.config.mjs` if needed:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Handle Rex UI plugin imports
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };
        }
        return config;
    },
    // ... existing Cesium config
};

export default nextConfig;
```

### Dynamic Imports (if needed)
```typescript
// For lazy loading Rex UI components
const loadRexUI = async () => {
    const { default: UIPlugin } = await import('phaser3-rex-plugins/plugins/ui-plugin.js');
    return UIPlugin;
};
```

## Common Issues and Solutions

### Issue 1: Plugin Not Loading
**Problem**: `this.rexUI is undefined`

**Solution**:
```typescript
// Ensure plugin is properly configured in scene
create() {
    // Check if plugin is available
    if (!this.rexUI) {
        console.error('Rex UI plugin not loaded');
        return;
    }
    // ... rest of code
}
```

### Issue 2: TypeScript Compilation Errors
**Problem**: TypeScript can't find Rex UI types

**Solution**:
- Ensure type declarations are in the correct location
- Add proper `typeRoots` configuration
- Import types explicitly where needed

### Issue 3: Component Not Rendering
**Problem**: Rex UI components don't appear

**Solution**:
```typescript
// Always call layout() after creating complex components
const tabs = this.rexUI.add.tabs(config);
tabs.layout(); // This is crucial!
```

### Issue 4: Event Handlers Not Working
**Problem**: Click events not firing

**Solution**:
```typescript
// Ensure proper event binding
this.tabs.on('button.click', this.handleClick, this);
// Not: this.tabs.on('button.click', this.handleClick);
```

## Performance Optimization

### Memory Management
```typescript
// Proper cleanup in scene shutdown
shutdown() {
    if (this.tabs) {
        this.tabs.destroy();
        this.tabs = null;
    }
    // Clean up other Rex UI components
}
```

### Texture Optimization
```typescript
// Reuse textures for similar components
private createReusableBackground(width: number, height: number) {
    const key = `bg_${width}_${height}`;
    if (!this.textures.exists(key)) {
        // Create and cache texture
        const graphics = this.add.graphics();
        graphics.fillStyle(0x4e342e);
        graphics.fillRoundedRect(0, 0, width, height, 10);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }
    return this.add.image(0, 0, key);
}
```

## Testing Setup

### Unit Tests
```typescript
// Mock Rex UI for testing
jest.mock('phaser3-rex-plugins/plugins/ui-plugin.js', () => ({
    default: class MockUIPlugin {
        // Mock implementation
    }
}));
```

### Integration Tests
```typescript
// Test Rex UI integration
describe('Rex UI Integration', () => {
    let scene: ClueDisplayScene;
    
    beforeEach(() => {
        scene = new ClueDisplayScene();
        // Setup mock Phaser game instance
    });
    
    test('should create tabs component', () => {
        scene.create();
        expect(scene.tabs).toBeDefined();
    });
});
```

## Debugging Tips

### Enable Rex UI Debug Mode
```typescript
// Add to scene create method for debugging
create() {
    // Enable debug drawing for layout issues
    this.tabs.layout().drawBounds(this.add.graphics(), 0xff0000);
}
```

### Console Logging
```typescript
// Log component hierarchy
console.log('Tabs children:', this.tabs.getElement('panel'));
console.log('Grid table items:', this.gridTable.items);
```

### Visual Debugging
```typescript
// Draw bounds around components
private drawDebugBounds(component: any, color: number = 0xff0000) {
    const bounds = component.getBounds();
    const graphics = this.add.graphics();
    graphics.lineStyle(2, color);
    graphics.strokeRectShape(bounds);
    return graphics;
}
```

## Project Integration Checklist

- [ ] Install phaser3-rex-plugins package
- [ ] Configure Phaser game config with Rex UI plugin
- [ ] Add TypeScript declarations
- [ ] Update webpack/Next.js config if needed
- [ ] Create test scene with basic Rex UI component
- [ ] Verify components render correctly
- [ ] Test event handling
- [ ] Add proper error handling and cleanup
- [ ] Document component usage patterns
- [ ] Set up debugging and testing utilities