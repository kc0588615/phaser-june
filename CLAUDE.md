# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a match-3 puzzle game with habitat/species themes built using:
- **Game Engine**: Phaser 3.90.0 
- **Framework**: Next.js 15.3.1 with React 18
- **Language**: Mixed JavaScript and TypeScript 
- **Mapping**: Cesium with Resium for habitat visualization

## Architecture

### Game Architecture (MVC Pattern)

- **Model**: `src/game/BackendPuzzle.js` - Core game logic, board state, match detection
- **View**: `src/game/BoardView.js` - Rendering logic, animations, visual representation
- **Controller**: `src/game/scenes/Game.js` - Input handling, game flow coordination

### React-Phaser Communication

Uses EventBus pattern (`src/game/EventBus.ts`) for bidirectional communication:
- React → Phaser: `EventBus.emit('event-name', data)`
- Phaser → React: Scene emits `current-scene-ready` when ready
- React accesses game via `ref.current.game` and scene via `ref.current.scene`

### Scene Flow

Standard Phaser scene progression:
1. `Boot.js` - Initial setup
2. `Preloader.js` - Asset loading
3. `MainMenu.js` - Title screen
4. `Game.js` - Main gameplay
5. `GameOver.js` - End screen

Each scene must emit `EventBus.emit('current-scene-ready', this)` for React integration.

### Key Game Components

- `MoveAction.js` - Handles gem swapping logic
- `ExplodeAndReplacePhase.js` - Match explosion and board refill animations
- `constants.js` - Game configuration (board size, gem types, etc.)

## TypeScript Migration Notes

Currently on `refactor/TS` branch converting from JavaScript:
- TypeScript strict mode enabled with some exceptions
- Path alias configured: `@/*` maps to `./src/*`
- Mixed JS/TS files during transition

## Cesium Integration

- Complex webpack configuration in `next.config.mjs` for Cesium
- Post-install script creates symlink: `node_modules/cesium/Build/Cesium` → `public/cesium`
- `CesiumMap.tsx` component for habitat visualization
- Integration with TiTiler backend for habitat data

## Testing

No testing framework currently configured. Only ESLint via Next.js core-web-vitals preset.

### Type Checking

TypeScript type checking available via:
```bash
npm run typecheck        # Single type check
npm run typecheck:watch  # Continuous type checking
```

## Important Notes

- Static export configured (`output: 'export'` in next.config.mjs)
- Assets stored in `public/assets/` (gem sprites, backgrounds)
- Development port is 8080, not the Next.js default 3000
- Optional analytics via `log.js` for template usage tracking

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
  gemini command:

### Examples:

**Single file analysis:**
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results

