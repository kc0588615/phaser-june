// src/game/scenes/Game.ts
import Phaser from 'phaser';
import { BackendPuzzle } from '../BackendPuzzle';
import { MoveAction, MoveDirection } from '../MoveAction';
import { BoardView } from '../BoardView';
import { OwlSprite } from '../ui/OwlSprite';
import {
    GRID_COLS, GRID_ROWS, AssetKeys,
    DRAG_THRESHOLD, MOVE_THRESHOLD,
    STREAK_STEP, STREAK_CAP, EARLY_BONUS_PER_SLOT, DEFAULT_TOTAL_CLUE_SLOTS
} from '../constants';
import { EventBus, EventPayloads, EVT_GAME_HUD_UPDATED, EVT_GAME_RESTART } from '../EventBus';
import { ExplodeAndReplacePhase, Coordinate } from '../ExplodeAndReplacePhase';
import { GemType } from '../constants';
import { 
  GemCategory, 
  CLUE_CONFIG, 
  CluePayload, 
  isClassificationComplete, 
  isKeyFactsComplete,
  isBehaviorComplete,
  isLifeCycleComplete,
  isConservationComplete,
  isGeographicComplete,
  isMorphologyComplete,
  resetAllProgressiveClues
} from '../clueConfig';
import type { Species } from '@/types/database';
import type { RasterHabitatResult } from '@/lib/speciesService';

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
    // --- Raster Habitat Integration ---
    private rasterHabitats: RasterHabitatResult[] = [];
    private usedRasterHabitats: Set<string> = new Set();
    
    // --- Streak and Scoring ---
    private streak: number = 0;
    private seenClueCategories: Set<GemCategory> = new Set();
    private turnBaseTotalScore: number = 0; // Accumulator for the current turn
    private anyMatchThisTurn: boolean = false; // Track if any match occurred this turn

    // Touch event handlers
    private _touchPreventDefaults: ((e: Event) => void) | null = null;
    
    // Owl sprite
    private owl?: OwlSprite;

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
            this.disableInputs();
            const finalScore = this.backendPuzzle.getScore();
            this.emitHud();
            console.log(`Game Over! Final score: ${finalScore}`);
            this.time.delayedCall(100, () => {
                this.scene.start('GameOver', { score: finalScore });
            });
        }
    }

    private currentMultiplier(): number {
        return Math.min(1 + (this.streak * STREAK_STEP), STREAK_CAP);
    }

    private emitHud(): void {
        if (!this.backendPuzzle) return;
        EventBus.emit(EVT_GAME_HUD_UPDATED, {
            score: this.backendPuzzle.getScore(),
            movesRemaining: this.backendPuzzle.getMovesRemaining(),
            streak: this.streak,
            multiplier: this.currentMultiplier(),
        });
    }

    private disableInputs(): void {
        this.canMove = false;
    }

    private handleRestart(): void {
        this.disableInputs();
        this.scene.restart();
    }

    private onMoveResolved(baseTurnScore: number, didAnyMatch: boolean): void {
        if (!this.backendPuzzle) return;
        
        // Decrement moves exactly once per resolved move
        this.backendPuzzle.decrementMoves(1);

        // Apply base score - streak bonus will be applied only on correct guesses
        // No more automatic streak incrementing on matches

        // Emit HUD update
        this.emitHud();

        // Disable input and transition when moves hit 0
        if (this.backendPuzzle.getMovesRemaining() <= 0) {
            this.disableInputs();
            this.emitHud();
            const finalScore = this.backendPuzzle.getScore();
            this.time.delayedCall(100, () => {
                this.scene.start('GameOver', { score: finalScore });
            });
        }
    }

    private onWrongGuess(): void {
        this.streak = 0;
        this.emitHud();
    }

    private onCorrectGuess(totalClueSlotsForSpecies?: number): void {
        if (!this.backendPuzzle) return;
        
        // Increment streak on correct guess
        this.streak += 1;
        
        const total = totalClueSlotsForSpecies ?? DEFAULT_TOTAL_CLUE_SLOTS;
        const revealed = Math.min(this.seenClueCategories.size, total);
        const earlyBase = Math.max(0, total - revealed) * EARLY_BONUS_PER_SLOT;
        const earlyWithStreak = Math.floor(earlyBase * this.currentMultiplier());
        this.backendPuzzle.addBonusScore(earlyWithStreak);
        this.seenClueCategories.clear();
        this.emitHud();
    }

    // Helper function to check if a progressive category is complete
    private isProgressiveCategoryComplete(category: GemCategory): boolean {
        if (!this.selectedSpecies) return false;
        
        switch (category) {
            case GemCategory.CLASSIFICATION: return isClassificationComplete(this.selectedSpecies);
            case GemCategory.GEOGRAPHIC: return isGeographicComplete(this.selectedSpecies);
            case GemCategory.MORPHOLOGY: return isMorphologyComplete(this.selectedSpecies);
            case GemCategory.KEY_FACTS: return isKeyFactsComplete(this.selectedSpecies);
            case GemCategory.BEHAVIOR: return isBehaviorComplete(this.selectedSpecies);
            case GemCategory.LIFE_CYCLE: return isLifeCycleComplete(this.selectedSpecies);
            case GemCategory.CONSERVATION: return isConservationComplete(this.selectedSpecies);
            default: return false; // Not a progressive category
        }
    }

    // Helper function to check if a category uses progressive clues
    private isProgressiveCategory(category: GemCategory): boolean {
        return [
            GemCategory.CLASSIFICATION,
            GemCategory.GEOGRAPHIC,
            GemCategory.MORPHOLOGY,
            GemCategory.KEY_FACTS,
            GemCategory.BEHAVIOR,
            GemCategory.LIFE_CYCLE,
            GemCategory.CONSERVATION
        ].includes(category);
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

        this.statusText = this.add.text(width / 2, height / 2, "Welcome to Critter Connect!\n\nClick on the globe to find a habitat area\nfor a mystery species.\n\nIf the clicked location does not have a species,\nthe nearest species habitat area will flash blue!\n\nFill your Clue List by matching gems and\nguess the species when you're ready. Good luck!", {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 10 },
            align: 'center',
            wordWrap: { width: Math.min(width * 0.8, 380) }
        }).setOrigin(0.5).setDepth(100);

        // Score display
        this.scoreText = this.add.text(20, height - 25, 'Score: 0', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setDepth(100);

        // Moves display
        this.movesText = this.add.text(width - 20, height - 25, 'Moves: 50', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setDepth(100);

        // Setup owl animations and create owl sprite
        OwlSprite.setupAnimations(this);
        // Calculate initial board position for owl alignment
        this.calculateBoardDimensions();
        this.owl = new OwlSprite(this, { 
            scale: 2.5,  // Reduced from 4 to 2.5
            boardOffsetX: this.boardOffset.x
        });
        this.owl.createAndRunIntro();

        // Initialize BackendPuzzle and BoardView, but board visuals are created later
        this.backendPuzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
        
        // Initialize streak and scoring state
        this.streak = 0;
        this.seenClueCategories = new Set();
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
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
        EventBus.on('species-guess-submitted', this.handleSpeciesGuess, this);
        EventBus.on(EVT_GAME_RESTART, this.handleRestart, this);

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
            
            // Reset streak and scoring state for new location
            this.streak = 0;
            this.seenClueCategories.clear();
            this.turnBaseTotalScore = 0;
            this.anyMatchThisTurn = false;
            
            // Store raster habitat data for green gem clues
            this.rasterHabitats = [...data.rasterHabitats];
            this.usedRasterHabitats.clear(); // Reset used raster habitats for new game
            console.log("Game Scene: Stored raster habitats:", this.rasterHabitats);
            
            if (this.currentSpecies.length > 0) {
                // Select the species with lowest ogc_fid
                this.selectedSpecies = this.currentSpecies[0];
                console.log("Game Scene: Selected species:", this.selectedSpecies.comm_name || this.selectedSpecies.sci_name, "ogc_fid:", this.selectedSpecies.ogc_fid);
                
                // Reset all progressive clues for new species
                resetAllProgressiveClues(this.selectedSpecies);
                
                // Emit event to inform React components about the new game
                // Hide the species name - player needs to guess it
                EventBus.emit('new-game-started', {
                    speciesName: 'Mystery Species',  // Hidden name for guessing game
                    speciesId: this.selectedSpecies.ogc_fid,
                    totalSpecies: this.currentSpecies.length,
                    currentIndex: this.currentSpeciesIndex + 1,
                    hiddenSpeciesName: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species'  // Store real name internally
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
                // Update boardView dimensions without animating (board will be recreated)
                this.boardView.updateDimensions(this.gemSize, this.boardOffset);
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
            
            // Emit initial HUD state
            this.emitHud();

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
        
        // Keep original gem sizing by adjusting for reduced rows
        // Original: 8 rows at 0.90 height. Now: 7 rows, so use (7/8) * 0.90 = 0.7875
        const usableWidth = width * 0.95;
        const usableHeight = height * 0.7875;  // Adjusted to maintain original gem size with 7 rows
        
        const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
        const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
        this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));
        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        
        this.boardOffset = {
            x: Math.round((width - boardWidth) / 2),
            y: Math.round((height - boardHeight) / 2)  // Centered position
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
                textStyle.setWordWrapWidth(Math.min(width * 0.8, 380));
            }
        }
        
        // Update UI positions
        if (this.movesText) {
            this.movesText.setPosition(width - 20, height - 25);
        }
        if (this.scoreText) {
            this.scoreText.setPosition(20, height - 25);
        }
        
        // Update owl position on resize with new board offset
        if (this.owl) {
            this.owl.setBoardOffsetX(this.boardOffset.x);
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
        
        // Reset turn tracking
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        
        // Capture grid state BEFORE applying the move to get original gem types
        const gridStateBeforeMove = this.backendPuzzle.getGridState();
        const phaseResult = this.backendPuzzle.getNextExplodeAndReplacePhase([moveAction]); // This applies the move
        
        if (!phaseResult.isNothingToDo()) {
            // Track turn score
            const phaseScore = this.backendPuzzle.calculatePhaseBaseScore(phaseResult);
            this.turnBaseTotalScore += phaseScore;
            this.anyMatchThisTurn = true;
            
            await this.animatePhaseWithOriginalGems(phaseResult, gridStateBeforeMove);
            await this.handleCascades();
        } else {
            console.warn("applyMoveAndHandleResults: Move was applied, but backend reports no matches. This might be a logic discrepancy.");
        }
        
        // Move is fully resolved, apply turn resolution
        this.onMoveResolved(this.turnBaseTotalScore, this.anyMatchThisTurn);
    }

    private async handleCascades(): Promise<void> {
        if (!this.backendPuzzle || !this.boardView) return;
        
        // Capture grid state BEFORE checking for cascade matches
        const gridStateBeforeCascade = this.backendPuzzle.getGridState();
        const cascadePhase = this.backendPuzzle.getNextExplodeAndReplacePhase([]);
        
        if (!cascadePhase.isNothingToDo()) {
            // Track cascade score
            const cascadeScore = this.backendPuzzle.calculatePhaseBaseScore(cascadePhase);
            this.turnBaseTotalScore += cascadeScore;
            this.anyMatchThisTurn = true;
            
            await this.animatePhaseWithOriginalGems(cascadePhase, gridStateBeforeCascade);
            await this.handleCascades();
        }
    }

    private async animatePhaseWithOriginalGems(phaseResult: ExplodeAndReplacePhase, originalGridState: any): Promise<void> {
        if (!this.boardView || !this.backendPuzzle) return;
        try {
            // Process clues using original gem types
            this.processMatchedGemsWithOriginalTypes(phaseResult.matches, originalGridState);
            
            await this.boardView.animateExplosions(phaseResult.matches.flat());
            await this.boardView.animateFalls(phaseResult.replacements, this.backendPuzzle.getGridState());
        } catch (error) {
            console.error("Error during phase animation:", error);
            if (this.boardView && this.backendPuzzle) {
                this.boardView.syncSpritesToGridPositions();
            }
        }
    }

    private async animatePhase(phaseResult: ExplodeAndReplacePhase): Promise<void> {
        if (!this.boardView || !this.backendPuzzle) return;
        try {
            // Process clues using current grid state (fallback method)
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

    private processMatchedGemsWithOriginalTypes(matches: Coordinate[][], originalGridState: any): void {
        if (!this.selectedSpecies || matches.length === 0) return;

        // Debug: Log all matches
        console.log("Game Scene: Processing matches with original gem types:", matches.length, "match groups");
        
        // Extract all gem types from matched coordinates using original grid state
        const matchedGemTypes = new Set<GemType>();
        
        for (const match of matches) {
            console.log("Game Scene: Match group with", match.length, "gems at coords:", match);
            for (const coord of match) {
                const [x, y] = coord;
                const gem = originalGridState[x]?.[y];
                if (gem) {
                    console.log(`Game Scene: Original gem at [${x},${y}] was ${gem.gemType}`);
                    matchedGemTypes.add(gem.gemType);
                }
            }
        }

        // Convert gem types to categories and generate clues
        for (const gemType of matchedGemTypes) {
            const category = this.gemTypeToCategory(gemType);
            if (category !== null) {
                // Special handling for progressive categories
                if (this.isProgressiveCategory(category)) {
                    const config = CLUE_CONFIG[category];
                    if (config) {
                        const clueText = config.getClue(this.selectedSpecies);
                        if (clueText) {
                            // Emit clue (do NOT add to revealedClues yet)
                            const clueData: CluePayload = {
                                category,
                                heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                                clue: clueText,
                                speciesId: this.selectedSpecies.ogc_fid,
                                name: config.categoryName,
                                icon: config.icon,
                                color: config.color
                            };
                            console.log("Game Scene: Revealing progressive clue for category:", category, clueData);
                            EventBus.emit('clue-revealed', clueData);
                            
                            // Only mark as revealed when sequence is complete
                            if (this.isProgressiveCategoryComplete(category)) {
                                this.revealedClues.add(category);
                                this.seenClueCategories.add(category);
                            }
                        } else {
                            // No more clues for this progressive category; ensure marked complete
                            this.revealedClues.add(category);
                            this.seenClueCategories.add(category);
                        }
                    }
                    continue; // move to next category
                }
                
                // Standard handling for other categories
                if (!this.revealedClues.has(category)) {
                    this.revealedClues.add(category);
                    this.seenClueCategories.add(category);
                    
                    // Generate clue for this category
                    let clueData: CluePayload | null = null;
                    if (category === GemCategory.HABITAT) {
                        // Use raster habitat data for green gems
                        clueData = this.generateRasterHabitatClue();
                    } else {
                        // Use CLUE_CONFIG for species-based clues
                        const config = CLUE_CONFIG[category];
                        if (config) {
                            const clueText = config.getClue(this.selectedSpecies);
                            if (clueText) {
                                clueData = {
                                    category,
                                    heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                                    clue: clueText,
                                    speciesId: this.selectedSpecies.ogc_fid,
                                    name: config.categoryName,
                                    icon: config.icon,
                                    color: config.color
                                };
                            }
                        }
                    }
                    
                    if (clueData && clueData.clue) {
                        console.log("Game Scene: Revealing clue for category:", category, clueData);
                        EventBus.emit('clue-revealed', clueData);
                    }
                }
            }
        }
    }

    private processMatchedGemsForClues(matches: Coordinate[][]): void {
        if (!this.selectedSpecies || matches.length === 0) return;

        // Debug: Log all matches
        console.log("Game Scene: Processing matches:", matches.length, "match groups");
        
        // Extract all gem types from matched coordinates
        const matchedGemTypes = new Set<GemType>();
        
        for (const match of matches) {
            console.log("Game Scene: Match group with", match.length, "gems at coords:", match);
            for (const coord of match) {
                if (this.backendPuzzle) {
                    const [x, y] = coord;
                    const gridState = this.backendPuzzle.getGridState();
                    const gem = gridState[x]?.[y];
                    if (gem) {
                        console.log(`Game Scene: Gem at [${x},${y}] is ${gem.gemType}`);
                        matchedGemTypes.add(gem.gemType);
                    }
                }
            }
        }

        // Convert gem types to categories and generate clues
        for (const gemType of matchedGemTypes) {
            const category = this.gemTypeToCategory(gemType);
            if (category !== null) {
                // Special handling for progressive categories
                if (this.isProgressiveCategory(category)) {
                    const config = CLUE_CONFIG[category];
                    if (config) {
                        const clueText = config.getClue(this.selectedSpecies);
                        if (clueText) {
                            // Emit clue (do NOT add to revealedClues yet)
                            const clueData: CluePayload = {
                                category,
                                heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                                clue: clueText,
                                speciesId: this.selectedSpecies.ogc_fid,
                                name: config.categoryName,
                                icon: config.icon,
                                color: config.color
                            };
                            console.log("Game Scene: Revealing progressive clue for category:", category, clueData);
                            EventBus.emit('clue-revealed', clueData);
                            
                            // Only mark as revealed when sequence is complete
                            if (this.isProgressiveCategoryComplete(category)) {
                                this.revealedClues.add(category);
                                this.seenClueCategories.add(category);
                            }
                        } else {
                            // No more clues for this progressive category; ensure marked complete
                            this.revealedClues.add(category);
                            this.seenClueCategories.add(category);
                        }
                    }
                    continue; // move to next category
                }
                
                // Standard handling for other categories
                if (!this.revealedClues.has(category)) {
                    this.revealedClues.add(category);
                    this.seenClueCategories.add(category);
                    
                    // Generate clue for this category
                    let clueData: CluePayload | null = null;
                    if (category === GemCategory.HABITAT) {
                        // Use raster habitat data for green gems
                        clueData = this.generateRasterHabitatClue();
                    } else {
                        // Use CLUE_CONFIG for species-based clues
                        const config = CLUE_CONFIG[category];
                        if (config) {
                            const clueText = config.getClue(this.selectedSpecies);
                            if (clueText) {
                                clueData = {
                                    category,
                                    heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                                    clue: clueText,
                                    speciesId: this.selectedSpecies.ogc_fid,
                                    name: config.categoryName,
                                    icon: config.icon,
                                    color: config.color
                                };
                            }
                        }
                    }
                    
                    if (clueData && clueData.clue) {
                        console.log("Game Scene: Revealing clue for category:", category, clueData);
                        EventBus.emit('clue-revealed', clueData);
                    }
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
            
            // Don't automatically advance - wait for player to guess the species
            if (this.statusText && this.statusText.active) {
                this.statusText.setText('All clues revealed! Can you guess the species?');
                
                // Clear the message after a few seconds
                this.time.delayedCall(3000, () => {
                    if (this.statusText && this.statusText.active) {
                        this.statusText.setText('');
                    }
                });
            }
        }
    }

    private advanceToNextSpecies(): void {
        this.currentSpeciesIndex++;
        
        if (this.currentSpeciesIndex < this.currentSpecies.length) {
            // Move to next species
            this.selectedSpecies = this.currentSpecies[this.currentSpeciesIndex];
            this.revealedClues.clear();
            this.allCluesRevealed = false;
            this.usedRasterHabitats.clear(); // Reset used raster habitats for new species
            this.seenClueCategories.clear(); // Reset for early guess bonus calculation
            
            // Reset all progressive clues for new species
            resetAllProgressiveClues(this.selectedSpecies);
            
            console.log("Game Scene: Advancing to next species:", this.selectedSpecies.comm_name || this.selectedSpecies.sci_name, "ogc_fid:", this.selectedSpecies.ogc_fid);
            
            // Emit event for new species
            // Hide the species name - player needs to guess it
            EventBus.emit('new-game-started', {
                speciesName: 'Mystery Species',  // Hidden name for guessing game
                speciesId: this.selectedSpecies.ogc_fid,
                totalSpecies: this.currentSpecies.length,
                currentIndex: this.currentSpeciesIndex + 1,
                hiddenSpeciesName: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species'  // Store real name internally
            });
        } else {
            // This shouldn't happen as handleSpeciesGuess already handles the last species
            console.log("Game Scene: Attempted to advance beyond last species");
        }
    }

    private handleSpeciesGuess(data: { guessedName: string; speciesId: number; isCorrect: boolean; actualName: string }): void {
        console.log("Game Scene: Species guess received:", data);
        
        // Check if this guess is for the current species
        if (!this.selectedSpecies || data.speciesId !== this.selectedSpecies.ogc_fid) {
            console.log("Game Scene: Guess is for a different species, ignoring");
            return;
        }
        
        if (data.isCorrect) {
            console.log("Game Scene: Correct species identified!");
            
            // Apply early guess bonus with streak multiplier
            this.onCorrectGuess(DEFAULT_TOTAL_CLUE_SLOTS);
            
            // Check if there are more species at this location
            if (this.currentSpeciesIndex + 1 < this.currentSpecies.length) {
                // Show success message and advance to next species after a delay
                if (this.statusText && this.statusText.active) {
                    this.statusText.setText(`Correct! You discovered the ${data.actualName}!\n\nPreparing next species...`);
                }
                
                // Advance to next species after a short delay
                this.time.delayedCall(3000, () => {
                    this.advanceToNextSpecies();
                    
                    if (this.statusText && this.statusText.active) {
                        this.statusText.setText('');
                    }
                });
            } else {
                // All species at this location discovered
                console.log("Game Scene: All species at this location discovered!");
                
                if (this.statusText && this.statusText.active) {
                    this.statusText.setText(`Correct! You discovered the ${data.actualName}!\n\nAll species at this location have been discovered.\n\nClick on the globe to select a new location.`);
                }
                
                // Emit event to signal completion after a delay to allow individual species toast to show first
                this.time.delayedCall(1000, () => {
                    EventBus.emit('all-species-completed', {
                        totalSpecies: this.currentSpecies.length
                    });
                });
                
                // Reset game state for new location selection
                this.time.delayedCall(5000, () => {
                    this.resetForNewLocation();
                });
            }
        } else {
            // Wrong guess - reset streak
            console.log("Game Scene: Wrong guess - resetting streak");
            this.onWrongGuess();
        }
    }

    private resetForNewLocation(): void {
        console.log("Game Scene: Resetting for new location selection");
        
        // Clear current species data
        this.currentSpecies = [];
        this.selectedSpecies = null;
        this.currentSpeciesIndex = 0;
        this.revealedClues.clear();
        this.allCluesRevealed = false;
        this.rasterHabitats = [];
        this.usedRasterHabitats.clear();
        
        // Clear the board
        if (this.boardView) {
            this.boardView.destroyBoard();
        }
        
        // Reset game state
        this.canMove = false;
        this.isBoardInitialized = false;
        
        // Reset streak and scoring state
        this.streak = 0;
        this.seenClueCategories.clear();
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        
        // Update status text
        if (this.statusText && this.statusText.active) {
            this.statusText.setText("Great job!\n\nClick on the globe to find a new habitat area\nfor another mystery species.");
        }
        
        // Emit reset event for React components
        EventBus.emit('game-reset', undefined);
    }

    private gemTypeToCategory(gemType: GemType): GemCategory | null {
        // Map gem types to categories based on corrected color scheme
        switch (gemType) {
            case 'red': return GemCategory.CLASSIFICATION;
            case 'green': return GemCategory.HABITAT;
            case 'blue': return GemCategory.GEOGRAPHIC; // Now includes habitat info
            case 'orange': return GemCategory.MORPHOLOGY; // Combines color/pattern and size/shape
            case 'white': return GemCategory.CONSERVATION;
            case 'black': return GemCategory.LIFE_CYCLE;
            case 'yellow': return GemCategory.BEHAVIOR; // Now includes diet info
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

    /**
     * Generate a raster habitat clue from the stored habitat distribution data
     */
    private generateRasterHabitatClue(): CluePayload | null {
        if (!this.selectedSpecies) return null;
        
        // Find the next unused habitat type from raster data
        const availableHabitats = this.rasterHabitats.filter(
            habitat => !this.usedRasterHabitats.has(habitat.habitat_type)
        );
        
        if (availableHabitats.length === 0) {
            console.log("Game Scene: No more raster habitat types available for clues");
            return null;
        }
        
        // Get the habitat with highest percentage (first one since they're sorted DESC)
        const nextHabitat = availableHabitats[0];
        this.usedRasterHabitats.add(nextHabitat.habitat_type);
        
        const clue = `Search Area is ${nextHabitat.percentage}% ${nextHabitat.habitat_type}`;
        
        console.log("Game Scene: Generated raster habitat clue:", clue);
        
        const habitatConfig = CLUE_CONFIG[GemCategory.HABITAT];
        return {
            category: GemCategory.HABITAT,
            heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
            clue: clue,
            speciesId: this.selectedSpecies.ogc_fid,
            name: habitatConfig.categoryName,
            icon: habitatConfig.icon,
            color: habitatConfig.color
        };
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
        
        // Reset raster habitat data
        this.rasterHabitats = [];
        this.usedRasterHabitats.clear();
        
        // Reset streak and scoring state
        this.streak = 0;
        this.seenClueCategories.clear();
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        
        // Remove EventBus listeners
        EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
        EventBus.off('species-guess-submitted', this.handleSpeciesGuess, this);
        EventBus.off(EVT_GAME_RESTART, this.handleRestart, this);
        
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