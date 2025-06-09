// src/game/scenes/Game.ts
import Phaser from 'phaser';
import { BackendPuzzle } from '../BackendPuzzle';
import { MoveAction, MoveDirection } from '../MoveAction';
import { BoardView } from '../BoardView';
import {
    GRID_COLS, GRID_ROWS, AssetKeys,
    DRAG_THRESHOLD, MOVE_THRESHOLD
} from '../constants';
import { EventBus, EventPayloads } from '../EventBus';
import { ExplodeAndReplacePhase, Coordinate } from '../ExplodeAndReplacePhase';
import { GemClueMapper, GemCategory, gemCategoryMapping } from '../gemCategoryMapping';
import { GemType } from '../constants';
import type { Species } from '@/types/database';

interface BoardOffset {
    x: number;
    y: number;
}

interface SpritePosition {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
}

export class Game extends Phaser.Scene {
    // --- MVC Components ---
    private backendPuzzle: BackendPuzzle | null = null;
    private boardView: BoardView | null = null;

    // --- Controller State ---
    private canMove: boolean = false; // Start false, true after board init
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private dragDirection: MoveDirection | null = null;
    private dragStartPointerX: number = 0;
    private dragStartPointerY: number = 0;
    private draggingSprites: Phaser.GameObjects.Sprite[] = [];
    private dragStartSpritePositions: SpritePosition[] = [];

    // --- Layout ---
    private gemSize: number = 64;
    private boardOffset: BoardOffset = { x: 0, y: 0 };

    // --- Backend Data ---
    private isBoardInitialized: boolean = false;
    private statusText: Phaser.GameObjects.Text | null = null;
    private scoreText: Phaser.GameObjects.Text | null = null;
    private movesText: Phaser.GameObjects.Text | null = null;
    
    // --- Species Integration ---
    private currentSpecies: Species[] = [];
    private selectedSpecies: Species | null = null;
    private revealedClues: Set<GemCategory> = new Set();
    private currentSpeciesIndex: number = 0;
    private allCluesRevealed: boolean = false;

    // Touch event handlers
    private _touchPreventDefaults: ((e: Event) => void) | null = null;

    constructor() {
        super('Game');
    }

    update(): void {
        if (!this.backendPuzzle || !this.isBoardInitialized) return;

        // Update UI
        if (this.scoreText) {
            this.scoreText.setText(`Score: ${this.backendPuzzle.getScore()}`);
        }
        if (this.movesText) {
            this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesRemaining()}`);
        }

        // Check game over
        if (this.backendPuzzle.isGameOver() && this.canMove) {
            this.canMove = false;
            const finalScore = this.backendPuzzle.getScore();
            console.log(`Game Over! Final score: ${finalScore}`);
            this.scene.start('GameOver', { score: finalScore });
        }
    }

    create(): void {
        console.log("Game Scene: create");
        const { width, height } = this.scale;

        if (this.textures.exists(AssetKeys.BACKGROUND)) {
            this.add.image(width / 2, height / 2, AssetKeys.BACKGROUND).setOrigin(0.5).setAlpha(0.5);
        } else {
            this.cameras.main.setBackgroundColor('#1a1a2e');
        }

        if (typeof BackendPuzzle === 'undefined' || typeof MoveAction === 'undefined' || typeof BoardView === 'undefined') {
            this.add.text(width / 2, height / 2, `Error: Game logic missing.\nCheck console.`, { 
                color: '#ff0000', 
                fontSize: '20px' 
            }).setOrigin(0.5);
            return;
        }

        this.statusText = this.add.text(width / 2, height / 2, "Waiting for location selection from map...", {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 },
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Score display
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setDepth(100);

        // Moves display
        this.movesText = this.add.text(width - 20, 20, 'Moves: 50', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setDepth(100);


        // Initialize BackendPuzzle and BoardView, but board visuals are created later
        this.backendPuzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
        this.calculateBoardDimensions();
        this.boardView = new BoardView(this, {
            cols: GRID_COLS,
            rows: GRID_ROWS,
            gemSize: this.gemSize,
            boardOffset: this.boardOffset
        });

        this.input.addPointer(1);
        this.disableTouchScrolling();
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('cesium-location-selected', this.initializeBoardFromCesium, this);

        this.resetDragState(); // Resets isDragging etc.
        this.canMove = false; // Input disabled until board initialized by Cesium
        this.isBoardInitialized = false;

        EventBus.emit('current-scene-ready', this);
        console.log("Game Scene: Create method finished. Waiting for Cesium data.");
    }

    private initializeBoardFromCesium(data: EventPayloads['cesium-location-selected']): void {
        console.log("Game Scene: Received 'cesium-location-selected' data:", data);
        this.canMove = false; // Disable moves during reinitialization
        this.isBoardInitialized = false; // Mark as not ready
        const { width, height } = this.scale;

        if (this.statusText && this.statusText.active) {
            this.statusText.setText("Initializing new game board...");
        }

        try {
            // Sort species by ogc_fid (lowest first)
            this.currentSpecies = [...data.species].sort((a, b) => a.ogc_fid - b.ogc_fid);
            this.currentSpeciesIndex = 0;
            this.revealedClues.clear(); // Reset clues for new game
            this.allCluesRevealed = false;
            
            if (this.currentSpecies.length > 0) {
                // Select the species with lowest ogc_fid
                this.selectedSpecies = this.currentSpecies[0];
                console.log("Game Scene: Selected species:", this.selectedSpecies.comm_name || this.selectedSpecies.sci_name, "ogc_fid:", this.selectedSpecies.ogc_fid);
                
                // Emit event to inform React components about the new game
                EventBus.emit('new-game-started', {
                    speciesName: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                    speciesId: this.selectedSpecies.ogc_fid,
                    totalSpecies: this.currentSpecies.length,
                    currentIndex: this.currentSpeciesIndex + 1
                });
            } else {
                this.selectedSpecies = null;
                console.log("Game Scene: No species available for this location");
                EventBus.emit('no-species-found', {});
            }

            if (!this.backendPuzzle) { // Should exist from create()
                this.backendPuzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
            }
            // Regenerate the board with new random gems
            this.backendPuzzle.regenerateBoard();

            this.calculateBoardDimensions(); // Recalculate for current scale
            if (!this.boardView) { // Should exist from create()
                this.boardView = new BoardView(this, {
                    cols: GRID_COLS,
                    rows: GRID_ROWS,
                    gemSize: this.gemSize,
                    boardOffset: this.boardOffset
                });
            } else {
                // Ensure boardView is updated with current dimensions
                this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);
            }

            // Destroy old board sprites and create new ones based on the (potentially new) backendPuzzle state
            if (this.boardView.destroyBoard) this.boardView.destroyBoard();
            this.boardView.createBoard(this.backendPuzzle.getGridState());

            if (this.statusText && this.statusText.active) {
                this.statusText.destroy();
                this.statusText = null;
            }
            this.isBoardInitialized = true;
            this.canMove = true; // Board is ready, enable input
            console.log("Game Scene: Board initialized with random gems. Input enabled.");

        } catch (error) {
            console.error("Game Scene: Error initializing board from Cesium data:", error);
            if (this.statusText && this.statusText.active) this.statusText.destroy();
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.statusText = this.add.text(width / 2, height / 2, `Error initializing board:\n${errorMessage}`, {
                fontSize: '18px',
                color: '#ff4444',
                backgroundColor: '#000000cc',
                align: 'center',
                padding: { x: 10, y: 5 },
                wordWrap: { width: width * 0.8 }
            }).setOrigin(0.5).setDepth(100);
            this.canMove = false;
            this.isBoardInitialized = false;
        }
    }

    private calculateBoardDimensions(): void {
        const { width, height } = this.scale;
        if (width <= 0 || height <= 0) {
            console.warn("Invalid scale dimensions.");
            return;
        }
        const usableWidth = width * 0.95;
        const usableHeight = height * 0.90;
        const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
        const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
        this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));
        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        this.boardOffset = {
            x: Math.round((width - boardWidth) / 2),
            y: Math.round((height - boardHeight) / 2)
        };
    }

    private handleResize(): void {
        console.log("Game Scene: Resize detected.");
        const { width, height } = this.scale;
        this.calculateBoardDimensions();
        
        if (this.statusText && this.statusText.active) {
            this.statusText.setPosition(width / 2, height / 2);
            const textStyle = this.statusText.style;
            if (textStyle && typeof textStyle.setWordWrapWidth === 'function') {
                textStyle.setWordWrapWidth(width * 0.8);
            }
        }
        
        // Update UI positions
        if (this.movesText) {
            this.movesText.setPosition(width - 20, 20);
        }
        
        if (this.boardView) {
            this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);
        }
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canMove || !this.isBoardInitialized || !this.boardView || !this.backendPuzzle) return;
        if (this.isDragging) { // Should not happen if logic is correct, but as a safeguard
            console.warn("PointerDown while already dragging. Resetting drag state.");
            this.resetDragState(); // Reset internal flags
            // Visually snap back any lingering sprites from a broken drag state
            if (this.boardView && this.draggingSprites.length > 0) {
                this.boardView.snapBack(this.draggingSprites, this.dragStartSpritePositions, undefined, 0, 0)
                    .catch(e => console.error("Error snapping back during PointerDown reset:", e));
            }
            this.draggingSprites = []; // Ensure these are clear
            this.dragStartSpritePositions = [];
        }

        const worldX = pointer.x;
        const worldY = pointer.y;
        const boardRect = new Phaser.Geom.Rectangle(
            this.boardOffset.x, this.boardOffset.y,
            GRID_COLS * this.gemSize, GRID_ROWS * this.gemSize
        );

        if (!boardRect.contains(worldX, worldY)) return;

        const gridX = Math.floor((worldX - this.boardOffset.x) / this.gemSize);
        const gridY = Math.floor((worldY - this.boardOffset.y) / this.gemSize);

        this.dragStartX = Phaser.Math.Clamp(gridX, 0, GRID_COLS - 1);
        this.dragStartY = Phaser.Math.Clamp(gridY, 0, GRID_ROWS - 1);
        this.dragStartPointerX = worldX;
        this.dragStartPointerY = worldY;
        this.isDragging = true; // Set drag flag
        this.dragDirection = null;
        // IMPORTANT: Initialize these here for the new drag operation
        this.draggingSprites = [];
        this.dragStartSpritePositions = [];
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging || !this.canMove || !this.isBoardInitialized || !this.boardView) return;
        if (!pointer.isDown) {
            this.handlePointerUp(pointer); // Treat as pointer up if button released
            return;
        }

        const worldX = pointer.x;
        const worldY = pointer.y;
        const deltaX = worldX - this.dragStartPointerX;
        const deltaY = worldY - this.dragStartPointerY;

        if (!this.dragDirection && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
            this.dragDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'row' : 'col';
            const allSprites = this.boardView.getGemsSprites();
            if (!allSprites) {
                this.cancelDrag("BoardView sprites unavailable");
                return;
            }

            const index = (this.dragDirection === 'row') ? this.dragStartY : this.dragStartX;
            const limit = (this.dragDirection === 'row') ? GRID_COLS : GRID_ROWS;

            // Clear and repopulate for this drag action
            this.draggingSprites = [];
            this.dragStartSpritePositions = [];

            for (let i = 0; i < limit; i++) {
                const x = (this.dragDirection === 'row') ? i : index;
                const y = (this.dragDirection === 'row') ? index : i;
                const sprite = allSprites[x]?.[y];
                if (sprite && sprite.active) {
                    this.draggingSprites.push(sprite);
                    this.dragStartSpritePositions.push({ x: sprite.x, y: sprite.y, gridX: x, gridY: y });
                    this.tweens.killTweensOf(sprite);
                }
            }
            if (this.draggingSprites.length === 0) {
                this.cancelDrag("No sprites in dragged line");
                return;
            }
        }

        if (this.dragDirection) {
            this.boardView.moveDraggingSprites(
                this.draggingSprites, this.dragStartSpritePositions, deltaX, deltaY, this.dragDirection
            );
        }
    }

    private async handlePointerUp(pointer: Phaser.Input.Pointer): Promise<void> {
        // Store these values *before* calling resetDragState or any async operation
        const wasDragging = this.isDragging;
        const currentDragDirection = this.dragDirection;
        const dSprites = [...this.draggingSprites]; // Critical: Copy before resetDragState clears them
        const dStartPositions = [...this.dragStartSpritePositions]; // Critical: Copy
        const sPointerX = this.dragStartPointerX;
        const sPointerY = this.dragStartPointerY;
        const sGridX = this.dragStartX;
        const sGridY = this.dragStartY;

        if (!wasDragging) { // If not dragging (e.g. just a click, or already processed)
            this.resetDragState(); // Still reset to be safe
            return;
        }

        // Reset drag state flags immediately. Visuals handled based on match outcome.
        this.resetDragState();

        // Calculate deltas here as they are used in multiple branches below
        // These are the deltas from the start of the drag to the point of pointer release.
        const worldX = pointer.x;
        const worldY = pointer.y;
        const deltaX = worldX - sPointerX;
        const deltaY = worldY - sPointerY;

        if (!this.canMove || !this.isBoardInitialized || !this.boardView || !this.backendPuzzle) {
            console.warn("PointerUp: Conditions not met (canMove, board not ready, etc.).");
            if (dSprites.length > 0 && this.boardView) {
                // Pass currentDragDirection (which might be null) and calculated deltas.
                // The snapBack in BoardView will need to handle a potentially null dragDirection gracefully.
                await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
            }
            return; // Do not proceed further
        }

        if (!currentDragDirection || dSprites.length === 0) {
            console.log("Pointer up: No valid drag determined or no sprites collected.");
            if (dSprites.length > 0 && this.boardView) {
                // currentDragDirection is null or dSprites is empty.
                // Pass currentDragDirection (which is likely null) and deltas (which might be small/zero).
                // snapBack should handle this by likely defaulting to a non-sliding snap if direction is missing.
                await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
            }
            return;
        }

        this.canMove = false; // Disable input for processing the move

        const moveAction = this.calculateMoveAction(deltaX, deltaY, currentDragDirection, sGridX, sGridY);

        try {
            if (moveAction.amount === 0) {
                console.log("Pointer up: No logical move threshold met, snapping back.");
                await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
            } else {
                const hypotheticalMatches = this.backendPuzzle.getMatchesFromHypotheticalMove(moveAction);

                if (hypotheticalMatches && hypotheticalMatches.length > 0) {
                    console.log(`Pointer up: Committing move (Matches found)`);
                    this.boardView.updateGemsSpritesArrayAfterMove(moveAction);
                    this.boardView.snapDraggedGemsToFinalGridPositions();
                    await this.applyMoveAndHandleResults(moveAction);
                } else {
                    console.log(`Pointer up: Move resulted in NO matches. Snapping back.`);
                    await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
                }
            }
        } catch (error) {
            console.error("Error processing pointer up:", error);
            if (dSprites.length > 0 && this.boardView) {
                await this.boardView.snapBack(dSprites, dStartPositions, currentDragDirection || undefined, deltaX, deltaY);
            }
            if (this.boardView && this.backendPuzzle) {
                this.boardView.syncSpritesToGridPositions();
            }
        } finally {
            this.canMove = true;
        }
    }

    private async applyMoveAndHandleResults(moveAction: MoveAction): Promise<void> {
        if (!this.backendPuzzle || !this.boardView) return;
        const phaseResult = this.backendPuzzle.getNextExplodeAndReplacePhase([moveAction]); // This applies the move
        if (!phaseResult.isNothingToDo()) {
            await this.animatePhase(phaseResult);
            await this.handleCascades();
        } else {
            console.warn("applyMoveAndHandleResults: Move was applied, but backend reports no matches. This might be a logic discrepancy.");
        }
    }

    private async handleCascades(): Promise<void> {
        if (!this.backendPuzzle || !this.boardView) return;
        const cascadePhase = this.backendPuzzle.getNextExplodeAndReplacePhase([]);
        if (!cascadePhase.isNothingToDo()) {
            await this.animatePhase(cascadePhase);
            await this.handleCascades();
        }
    }

    private async animatePhase(phaseResult: ExplodeAndReplacePhase): Promise<void> {
        if (!this.boardView || !this.backendPuzzle) return;
        try {
            // Generate clues based on matched gems before animating
            this.processMatchedGemsForClues(phaseResult.matches);
            
            await this.boardView.animateExplosions(phaseResult.matches.flat());
            await this.boardView.animateFalls(phaseResult.replacements, this.backendPuzzle.getGridState());
        } catch (error) {
            console.error("Error during phase animation:", error);
            if (this.boardView && this.backendPuzzle) {
                this.boardView.syncSpritesToGridPositions();
            }
        }
    }

    private processMatchedGemsForClues(matches: Coordinate[][]): void {
        if (!this.selectedSpecies || matches.length === 0) return;

        // Extract all gem types from matched coordinates
        const matchedGemTypes = new Set<GemType>();
        
        for (const match of matches) {
            for (const coord of match) {
                if (this.backendPuzzle) {
                    const [x, y] = coord;
                    const gridState = this.backendPuzzle.getGridState();
                    const gem = gridState[x]?.[y];
                    if (gem) {
                        matchedGemTypes.add(gem.gemType);
                    }
                }
            }
        }

        // Convert gem types to categories and generate clues
        for (const gemType of matchedGemTypes) {
            const category = this.gemTypeToCategory(gemType);
            if (category !== null && !this.revealedClues.has(category)) {
                this.revealedClues.add(category);
                
                // Generate clue for this category
                const clueData = GemClueMapper.getClueForCategory(this.selectedSpecies, category);
                if (clueData && clueData.clue) {
                    console.log("Game Scene: Revealing clue for category:", category, clueData);
                    EventBus.emit('clue-revealed', clueData);
                }
            }
        }

        // Check if all clues are revealed (9 categories total)
        if (this.revealedClues.size >= 9 && !this.allCluesRevealed) {
            this.allCluesRevealed = true;
            console.log("Game Scene: All clues revealed for species:", this.selectedSpecies.ogc_fid);
            
            // Emit event that all clues are revealed
            EventBus.emit('all-clues-revealed', {
                speciesId: this.selectedSpecies.ogc_fid
            });
            
            // Advance to next species after a delay
            this.time.delayedCall(2000, () => {
                this.advanceToNextSpecies();
            });
        }
    }

    private advanceToNextSpecies(): void {
        this.currentSpeciesIndex++;
        
        if (this.currentSpeciesIndex < this.currentSpecies.length) {
            // Move to next species
            this.selectedSpecies = this.currentSpecies[this.currentSpeciesIndex];
            this.revealedClues.clear();
            this.allCluesRevealed = false;
            
            console.log("Game Scene: Advancing to next species:", this.selectedSpecies.comm_name || this.selectedSpecies.sci_name, "ogc_fid:", this.selectedSpecies.ogc_fid);
            
            // Emit event for new species
            EventBus.emit('new-game-started', {
                speciesName: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                speciesId: this.selectedSpecies.ogc_fid,
                totalSpecies: this.currentSpecies.length,
                currentIndex: this.currentSpeciesIndex + 1
            });
        } else {
            // All species completed
            console.log("Game Scene: All species completed!");
            EventBus.emit('all-species-completed', {
                totalSpecies: this.currentSpecies.length
            });
        }
    }

    private gemTypeToCategory(gemType: GemType): GemCategory | null {
        // Map gem types to categories based on corrected color scheme
        switch (gemType) {
            case 'red': return GemCategory.CLASSIFICATION;
            case 'green': return GemCategory.HABITAT;
            case 'blue': return GemCategory.GEOGRAPHIC;
            case 'orange': return GemCategory.MORPHOLOGY; // Combines color/pattern and size/shape
            case 'pink': return GemCategory.DIET;
            case 'white': return GemCategory.BEHAVIOR;
            case 'black': return GemCategory.LIFE_CYCLE;
            case 'yellow': return GemCategory.CONSERVATION;
            case 'purple': return GemCategory.KEY_FACTS; // Uses key_fact1, key_fact2, key_fact3
            default: return null;
        }
    }

    private resetDragState(): void {
        this.isDragging = false;
        this.dragDirection = null;
        this.draggingSprites = []; // Ensure these are cleared
        this.dragStartSpritePositions = []; // Ensure these are cleared
        // dragStartX, Y, etc., are fine to be overwritten on next POINTER_DOWN
    }

    private cancelDrag(reason: string = "Cancelled"): void {
        console.warn(`Drag cancelled: ${reason}`);
        if (this.boardView && this.draggingSprites.length > 0 && this.dragStartSpritePositions.length > 0) {
            this.boardView.snapBack(this.draggingSprites, this.dragStartSpritePositions, undefined, 0, 0)
                .catch(err => console.error("Error snapping back on cancel:", err));
        }
        this.resetDragState();
        if (this.isBoardInitialized) this.canMove = true;
    }

    private calculateMoveAction(deltaX: number, deltaY: number, direction: MoveDirection, startGridX: number, startGridY: number): MoveAction {
        let cellsMoved = 0;
        let index = 0;
        if (direction === 'row') {
            cellsMoved = deltaX / this.gemSize;
            index = startGridY;
        } else { // 'col'
            cellsMoved = deltaY / this.gemSize;
            index = startGridX;
        }
        let amount = 0;
        if (Math.abs(cellsMoved) >= MOVE_THRESHOLD) {
            amount = Math.round(cellsMoved);
        }
        return new MoveAction(direction, index, amount);
    }

    private disableTouchScrolling(): void {
        if (this.game.canvas) {
            this.game.canvas.style.touchAction = 'none';
            const opts = { passive: false };
            const preventDefault = (e: Event) => e.preventDefault();
            this.game.canvas.addEventListener('touchstart', preventDefault, opts);
            this.game.canvas.addEventListener('touchmove', preventDefault, opts);
            this._touchPreventDefaults = preventDefault;
        }
    }

    private enableTouchScrolling(): void {
        if (this.game.canvas) {
            this.game.canvas.style.touchAction = 'auto';
            if (this._touchPreventDefaults) {
                this.game.canvas.removeEventListener('touchstart', this._touchPreventDefaults);
                this.game.canvas.removeEventListener('touchmove', this._touchPreventDefaults);
                this._touchPreventDefaults = null;
            }
        }
    }

    shutdown(): void {
        console.log("Game Scene: Shutting down...");
        EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.input.removeAllListeners(Phaser.Input.Events.POINTER_DOWN);
        this.input.removeAllListeners(Phaser.Input.Events.POINTER_MOVE);
        this.input.removeAllListeners(Phaser.Input.Events.POINTER_UP);
        this.input.removeAllListeners(Phaser.Input.Events.POINTER_UP_OUTSIDE);
        this.enableTouchScrolling();

        if (this.boardView) {
            this.boardView.destroyBoard();
            this.boardView = null;
        }
        this.backendPuzzle = null;
        if (this.statusText) {
            this.statusText.destroy();
            this.statusText = null;
        }
        if (this.scoreText) {
            this.scoreText.destroy();
            this.scoreText = null;
        }
        if (this.movesText) {
            this.movesText.destroy();
            this.movesText = null;
        }

        this.resetDragState(); // Clear drag state variables
        this.canMove = false;
        this.isBoardInitialized = false;
        
        // Reset species data
        this.currentSpecies = [];
        this.selectedSpecies = null;
        this.revealedClues.clear();
        this.currentSpeciesIndex = 0;
        this.allCluesRevealed = false;
        
        // Emit game reset event
        EventBus.emit('game-reset', undefined);
        
        console.log("Game Scene: Shutdown complete.");
    }

    private verifyBoardState(): void {
        if (!this.backendPuzzle || !this.boardView) return;
        const modelState = this.backendPuzzle.getGridState();
        const viewSprites = this.boardView.getGemsSprites();
        let mismatches = 0;
        for (let x = 0; x < GRID_COLS; x++) {
            for (let y = 0; y < GRID_ROWS; y++) {
                const modelGem = modelState[x]?.[y];
                const viewSprite = viewSprites[x]?.[y];
                if (!modelGem && viewSprite && viewSprite.active) {
                    console.warn(`Verify Mismatch: View sprite at [${x},${y}], Model empty.`);
                    mismatches++;
                } else if (modelGem && (!viewSprite || !viewSprite.active)) {
                    console.warn(`Verify Mismatch: Model gem '${modelGem.gemType}' at [${x},${y}], View no active sprite.`);
                    mismatches++;
                } else if (modelGem && viewSprite && viewSprite.active) {
                    if (viewSprite.getData('gemType') !== modelGem.gemType) {
                        console.warn(`Verify Mismatch: Type diff at [${x},${y}]. M: ${modelGem.gemType}, V: ${viewSprite.getData('gemType')}`);
                        mismatches++;
                    }
                    if (viewSprite.getData('gridX') !== x || viewSprite.getData('gridY') !== y) {
                        console.warn(`Verify Mismatch: Sprite at [${x},${y}] thinks its pos is [${viewSprite.getData('gridX')},${viewSprite.getData('gridY')}]`);
                        mismatches++;
                    }
                }
            }
        }
        if (mismatches === 0) console.log("Verify Board State: OK.");
        else console.error(`Verify Board State: Found ${mismatches} Mismatches!`);
    }
}