// src/game/scenes/Game.ts
import Phaser from 'phaser';
import { BackendPuzzle } from '../BackendPuzzle';
import { MoveAction, MoveDirection } from '../MoveAction';
import { BoardView } from '../BoardView';
import { OwlSprite } from '../ui/OwlSprite';
import {
    GRID_COLS, GRID_ROWS, AssetKeys,
    DRAG_THRESHOLD, MOVE_THRESHOLD,
    STREAK_STEP, STREAK_CAP, EARLY_BONUS_PER_SLOT, DEFAULT_TOTAL_CLUE_SLOTS,
    MAX_MOVES,
    MOVE_LARGE_MATCH_THRESHOLD,
    MOVE_HUGE_MATCH_THRESHOLD,
    MULTIPLIER_LARGE_MATCH,
    MULTIPLIER_HUGE_MATCH,
    MULTIPLIER_MULTI_CATEGORY,
    MULTIPLIER_REPEAT_CATEGORY
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

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'unknown';
}

function getCategoryKey(category: GemCategory): string {
    const config = CLUE_CONFIG[category];
    if (config?.categoryName) {
        return slugify(config.categoryName);
    }
    return `category_${category}`;
}

function deriveClueFieldAndValue(payload: CluePayload): { field: string; value: string | null } {
    const rawField = (payload as any).field as string | undefined;
    const rawValue = (payload as any).value as string | undefined;

    if (rawField) {
        return { field: slugify(rawField), value: rawValue ?? payload.clue ?? null };
    }

    const clueText = payload.clue ?? '';
    const colonIndex = clueText.indexOf(':');
    if (colonIndex > -1) {
        const field = slugify(clueText.slice(0, colonIndex));
        const value = clueText.slice(colonIndex + 1).trim() || null;
        return { field: field || 'detail', value };
    }

    const fallbackField = payload.name ? slugify(payload.name) : 'detail';
    return { field: fallbackField, value: clueText || null };
}

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

interface MoveSummary {
    largestMatch: number;
    matchGroups: number;
    categoriesMatched: Set<GemCategory>;
    gemTypesMatched: Set<GemType>;
    cascades: number;
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
    private multiplierText: Phaser.GameObjects.Text | null = null;
    private pauseButtonContainer: Phaser.GameObjects.Container | null = null;
    private pauseButton: Phaser.GameObjects.Rectangle | null = null;
    private pauseButtonLabel: Phaser.GameObjects.Text | null = null;
    private pauseOverlay: Phaser.GameObjects.Container | null = null;
    private pauseOverlayBackground: Phaser.GameObjects.Rectangle | null = null;
    private pauseOverlayTitle: Phaser.GameObjects.Text | null = null;
    private pauseOverlayResumeButton: Phaser.GameObjects.Text | null = null;
    private isPaused: boolean = false;
    private canMoveBeforePause: boolean = false;
    
    // --- Species Integration ---
    private currentSpecies: Species[] = [];
    private selectedSpecies: Species | null = null;
    private revealedClues: Set<GemCategory> = new Set();
    private completedClueCategories: Set<GemCategory> = new Set();
    private currentSpeciesIndex: number = 0;
    private allCluesRevealed: boolean = false;
    // --- Raster Habitat Integration ---
    private rasterHabitats: RasterHabitatResult[] = [];
    private usedRasterHabitats: Set<string> = new Set();
    private discoveredSpeciesIds: Set<number> = new Set();

    // --- Player Tracking ---
    private currentUserId: string | null = null; // Cache user ID
    private currentSessionId: string | null = null; // Active session
    private clueCountThisSpecies: number = 0; // Track clues for current species
    private incorrectGuessesThisSpecies: number = 0; // Track wrong guesses
    private speciesStartTime: number = 0; // Time when species started
    
    // --- Streak and Scoring ---
    private streak: number = 0;
    private seenClueCategories: Set<GemCategory> = new Set();
    private turnBaseTotalScore: number = 0; // Accumulator for the current turn
    private anyMatchThisTurn: boolean = false; // Track if any match occurred this turn
    private currentMoveSummary: MoveSummary | null = null;
    private lastMoveCategories: Set<GemCategory> = new Set();
    private lastAppliedMoveMultiplier: number = 1;
    private isResolvingMove: boolean = false;

    // Touch event handlers
    private _touchPreventDefaults: ((e: Event) => void) | null = null;
    
    // Owl sprite
    private owl?: OwlSprite;

    constructor() {
        super('Game');
    }

    private loadDiscoveredSpeciesFromCache(): void {
        if (typeof window === 'undefined') return;

        try {
            const raw = window.localStorage.getItem('discoveredSpecies');
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;

            for (const entry of parsed) {
                const id = Number((entry as any)?.id ?? entry);
                if (Number.isFinite(id)) {
                    this.discoveredSpeciesIds.add(id);
                }
            }
        } catch (error) {
            console.warn('Game Scene: Failed to load discovered species from storage:', error);
        }
    }

    private async hydrateDiscoveredSpeciesFromBackend(_userId: string): Promise<void> {
        // Auth is not configured yet; backend hydration is disabled.
        return;
    }

    private resetSpeciesTrackingCounters(): void {
        this.clueCountThisSpecies = 0;
        this.incorrectGuessesThisSpecies = 0;
        this.speciesStartTime = Date.now();
    }

    private hasActiveDisplayList(): boolean {
        const factory = this.add as Phaser.GameObjects.GameObjectFactory & { displayList?: Phaser.GameObjects.DisplayList | null };
        const displayList = factory?.displayList ?? null;
        const status = this.sys?.settings?.status ?? Phaser.Scenes.DESTROYED;
        return !!displayList && status < Phaser.Scenes.SHUTDOWN;
    }

    update(): void {
        if (!this.backendPuzzle || !this.isBoardInitialized) return;

        // Update UI
        if (this.scoreText) {
            this.scoreText.setText(`Score: ${this.backendPuzzle.getScore()}`);
        }
        if (this.movesText) {
            this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesUsed()}/${this.backendPuzzle.getMaxMoves()}`);
        }

        // Check game over
        if (this.backendPuzzle.isGameOver() && this.canMove && !this.isPaused) {
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
            movesUsed: this.backendPuzzle.getMovesUsed(),
            maxMoves: this.backendPuzzle.getMaxMoves(),
            streak: this.streak,
            multiplier: this.currentMultiplier(),
            moveMultiplier: this.lastAppliedMoveMultiplier,
        });
    }

    private disableInputs(): void {
        this.canMove = false;
    }

    private handleRestart(): void {
        this.disableInputs();
        this.scene.restart();
    }

    private onMoveResolved(baseTurnScore: number, didAnyMatch: boolean, moveMultiplier: number): void {
        if (!this.backendPuzzle) return;

        this.lastAppliedMoveMultiplier = moveMultiplier;
        this.updateMultiplierText(moveMultiplier);

        if (didAnyMatch) {
            this.backendPuzzle.registerMove();
            if (this.movesText) {
                this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesUsed()}/${this.backendPuzzle.getMaxMoves()}`);
            }
        }

        this.emitHud();

        // Disable input and transition when moves hit limit
        if (this.backendPuzzle.isGameOver()) {
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
        this.movesText = this.add.text(width - 20, height - 25, `Moves: 0/${MAX_MOVES}`, {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setDepth(100);

        this.multiplierText = this.add.text(20, height - 55, '', {
            fontSize: '18px',
            color: '#ffe66d',
            stroke: '#000000',
            strokeThickness: 2
        }).setDepth(100);
        this.updateMultiplierText(1);

        // Setup owl animations and create owl sprite
        OwlSprite.setupAnimations(this);
        // Calculate initial board position for owl alignment
        this.calculateBoardDimensions();
        
        // Calculate owl scale based on gem size (proportional scaling)
        // Base scale is 2.5 when gem size is 58 (the reference size)
        const referenceGemSize = 58;
        const baseOwlScale = 2.5;
        const owlScale = (this.gemSize / referenceGemSize) * baseOwlScale;
        
        // Position owl flush with the left edge of the gameboard
        this.owl = new OwlSprite(this, { 
            scale: owlScale,  // Dynamically scaled based on gem size
            boardOffsetX: this.boardOffset.x,  // Flush with board's left edge
            boardOffsetY: this.boardOffset.y
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
        this.createPauseControls();

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

        this.loadDiscoveredSpeciesFromCache();

        // Initialize player tracking
        this.initializePlayerTracking();

        console.log("Game Scene: Create method finished. Waiting for Cesium data.");
    }

    private async initializePlayerTracking(): Promise<void> {
        // Auth is not configured yet; player tracking remains disabled.
        this.currentUserId = null;
        this.currentSessionId = null;
    }

    private createPauseControls(): void {
        if (this.pauseButtonContainer) {
            this.pauseButtonContainer.destroy(true);
            this.pauseButtonContainer = null;
            this.pauseButton = null;
            this.pauseButtonLabel = null;
        }

        const buttonSize = 36;
        const buttonBg = this.add.rectangle(0, 0, buttonSize, buttonSize, 0x000000, 0.45)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(110);
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x111111, 0.6));
        buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x000000, 0.45));
        buttonBg.on('pointerup', () => {
            if (!this.isPaused) {
                this.togglePause(true);
            }
        });

        const label = this.add.text(0, 0, 'II', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(111);

        const container = this.add.container(0, 0, [buttonBg, label]).setDepth(110);
        container.setScrollFactor(0);
        container.setVisible(this.isBoardInitialized);

        this.pauseButtonContainer = container;
        this.pauseButton = buttonBg;
        this.pauseButtonLabel = label;

        this.ensurePauseOverlay();
        this.positionPauseButton();
    }

    private ensurePauseOverlay(): void {
        if (!this.hasActiveDisplayList()) {
            console.warn('Game Scene: Display list unavailable, skipping pause overlay setup.');
            return;
        }

        if (this.pauseOverlay) {
            this.pauseOverlay.destroy(true);
        }

        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        const centerX = this.boardOffset.x + boardWidth / 2;
        const centerY = this.boardOffset.y + boardHeight / 2;

        const shouldBeVisible = this.isPaused;

        const overlayBg = this.add.rectangle(centerX, centerY, boardWidth + 40, boardHeight + 40, 0x050505, 0.65)
            .setOrigin(0.5)
            .setDepth(300)
            .setVisible(shouldBeVisible);
        overlayBg.setInteractive({ useHandCursor: false });

        const title = this.add.text(centerX, centerY - 40, 'Paused', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(301).setVisible(shouldBeVisible);

        const resumeButton = this.add.text(centerX, centerY + 10, 'Resume', {
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#1d4ed8',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setDepth(301).setVisible(shouldBeVisible);
        resumeButton.setInteractive({ useHandCursor: true });
        resumeButton.on('pointerup', () => this.togglePause(false));
        resumeButton.on('pointerover', () => resumeButton.setBackgroundColor('#2563eb'));
        resumeButton.on('pointerout', () => resumeButton.setBackgroundColor('#1d4ed8'));

        const container = this.add.container(0, 0, [overlayBg, title, resumeButton])
            .setDepth(300)
            .setVisible(shouldBeVisible);
        container.setScrollFactor(0);

        this.pauseOverlay = container;
        this.pauseOverlayBackground = overlayBg;
        this.pauseOverlayTitle = title;
        this.pauseOverlayResumeButton = resumeButton;
    }

    private updatePauseOverlayLayout(): void {
        if (
            !this.pauseOverlay ||
            !this.pauseOverlayBackground ||
            !this.pauseOverlayTitle ||
            !this.pauseOverlayResumeButton ||
            !this.pauseOverlayBackground.geom
        ) {
            // The overlay may have been destroyed by Phaser (geom null). Ensure it exists before resizing.
            this.ensurePauseOverlay();
        }

        if (
            !this.pauseOverlay ||
            !this.pauseOverlayBackground ||
            !this.pauseOverlayTitle ||
            !this.pauseOverlayResumeButton ||
            !this.pauseOverlayBackground.geom
        ) {
            return;
        }

        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        const centerX = this.boardOffset.x + boardWidth / 2;
        const centerY = this.boardOffset.y + boardHeight / 2;

        this.pauseOverlayBackground
            .setPosition(centerX, centerY)
            .setSize(boardWidth + 40, boardHeight + 40);
        this.pauseOverlayTitle.setPosition(centerX, centerY - 40);
        this.pauseOverlayResumeButton.setPosition(centerX, centerY + 10);
    }

    private togglePause(shouldPause: boolean): void {
        if (this.isPaused === shouldPause) return;
        this.isPaused = shouldPause;

        if (shouldPause) {
            this.canMoveBeforePause = this.canMove;
            this.canMove = false;
            this.pauseButtonContainer?.setVisible(false);
            this.tweens.pauseAll();
            this.time.timeScale = 0;
            this.input.mouse?.releasePointerLock();
            this.pauseOverlay?.setVisible(true);
            this.pauseOverlayBackground?.setVisible(true);
            this.pauseOverlayTitle?.setVisible(true);
            this.pauseOverlayResumeButton?.setVisible(true);
        } else {
            this.time.timeScale = 1;
            this.tweens.resumeAll();
            this.pauseOverlay?.setVisible(false);
            this.pauseOverlayBackground?.setVisible(false);
            this.pauseOverlayTitle?.setVisible(false);
            this.pauseOverlayResumeButton?.setVisible(false);
            this.pauseButtonContainer?.setVisible(true);
            if (this.backendPuzzle && !this.backendPuzzle.isGameOver() && !this.isResolvingMove && this.canMoveBeforePause) {
                this.canMove = true;
            }
            this.canMoveBeforePause = false;
        }
    }

    private positionPauseButton(): void {
        if (!this.pauseButtonContainer) return;
        const boardWidth = GRID_COLS * this.gemSize;
        const x = this.boardOffset.x + boardWidth - 18;
        const y = this.boardOffset.y - 42;
        this.pauseButtonContainer.setPosition(x, y);
        this.updatePauseOverlayLayout();
    }

    private createEmptyMoveSummary(): MoveSummary {
        return {
            largestMatch: 0,
            matchGroups: 0,
            categoriesMatched: new Set(),
            gemTypesMatched: new Set(),
            cascades: 0
        };
    }

    // --- Player Tracking Event Handlers ---

    private handleClueRevealed = async (payload: CluePayload): Promise<void> => {
        console.log('🔔 handleClueRevealed called:', {
            hasCurrentUserId: !!this.currentUserId,
            currentUserId: this.currentUserId,
            hasSelectedSpecies: !!this.selectedSpecies,
            speciesId: this.selectedSpecies?.ogc_fid,
            category: payload.category,
            clue: payload.clue
        });

        if (!this.currentUserId || !this.selectedSpecies) {
            console.warn('⚠️ Skipping clue tracking:', {
                reason: !this.currentUserId ? 'No currentUserId' : 'No selectedSpecies',
                currentUserId: this.currentUserId,
                selectedSpecies: this.selectedSpecies?.ogc_fid
            });
            return;
        }

        try {
            const { trackClueUnlock } = await import('@/lib/playerTracking');
            const clueCategory = getCategoryKey(payload.category);
            const { field, value } = deriveClueFieldAndValue(payload);

            console.log('📝 Calling trackClueUnlock with:', {
                userId: this.currentUserId,
                speciesId: this.selectedSpecies.ogc_fid,
                category: clueCategory,
                field,
                value
            });

            const wasNew = await trackClueUnlock(
                this.currentUserId,
                this.selectedSpecies.ogc_fid,
                clueCategory,
                field,
                value,
                null // discovery_id will be linked later
            );

            if (wasNew) {
                this.clueCountThisSpecies++;
                console.log(`✅ New clue tracked! Total for species: ${this.clueCountThisSpecies}`);
            } else if (wasNew === false) {
                console.log('ℹ️ Duplicate clue (already unlocked)');
            } else {
                console.warn('⚠️ trackClueUnlock returned null (error or queued)');
            }
        } catch (error) {
            console.error('❌ Failed to track clue unlock:', error);
        }
    };

    private handleHudUpdate = async (data: EventPayloads['game-hud-updated']): Promise<void> => {
        if (!this.currentSessionId || !this.backendPuzzle) return;

        try {
            const { updateSessionProgress } = await import('@/lib/playerTracking');

            // Count total species discovered in this session
            const speciesDiscovered = this.currentSpeciesIndex; // Species completed before current

            // Count total clues unlocked in session (all categories revealed)
            const cluesUnlocked = this.revealedClues.size;

            // Debounced update (10s delay, auto-batched)
            await updateSessionProgress(
                this.currentSessionId,
                data.movesUsed,
                data.score,
                speciesDiscovered,
                cluesUnlocked
            );
        } catch (error) {
            console.error('Failed to update session progress:', error);
        }
    };

    private handleBeforeUnload = async (): Promise<void> => {
        if (!this.currentSessionId || !this.backendPuzzle) return;

        try {
            const { forceSessionUpdate } = await import('@/lib/playerTracking');

            // Force immediate flush (bypass debounce)
            await forceSessionUpdate(
                this.currentSessionId,
                this.backendPuzzle.getMovesUsed(),
                this.backendPuzzle.getScore(),
                this.currentSpeciesIndex,
                this.revealedClues.size
            );
        } catch (error) {
            console.error('Failed to flush session on unload:', error);
        }
    };

    private recordMatchesForSummary(matches: Coordinate[][], gridState?: any): void {
        if (!this.currentMoveSummary || !matches || matches.length === 0) return;
        this.currentMoveSummary.matchGroups += matches.length;
        const state = gridState ?? this.backendPuzzle?.getGridState();
        for (const match of matches) {
            if (match.length > this.currentMoveSummary.largestMatch) {
                this.currentMoveSummary.largestMatch = match.length;
            }
            for (const [x, y] of match) {
                const gem = state?.[x]?.[y];
                if (gem && gem.gemType) {
                    this.currentMoveSummary.gemTypesMatched.add(gem.gemType);
                    const category = this.gemTypeToCategory(gem.gemType);
                    if (category !== null) {
                        this.currentMoveSummary.categoriesMatched.add(category);
                    }
                }
            }
        }
    }

    private applyMoveBonuses(baseScore: number): { finalScore: number; multiplier: number; repeatedCategories: GemCategory[] } {
        if (!this.currentMoveSummary || baseScore <= 0 || !this.anyMatchThisTurn) {
            return { finalScore: baseScore, multiplier: 1, repeatedCategories: [] };
        }

        let multiplier = 1;
        const repeatedCategories: GemCategory[] = [];
        const summary = this.currentMoveSummary;

        if (summary.largestMatch >= MOVE_HUGE_MATCH_THRESHOLD) {
            multiplier *= MULTIPLIER_HUGE_MATCH;
        } else if (summary.largestMatch >= MOVE_LARGE_MATCH_THRESHOLD) {
            multiplier *= MULTIPLIER_LARGE_MATCH;
        }

        if (summary.categoriesMatched.size > 1) {
            multiplier *= MULTIPLIER_MULTI_CATEGORY;
        }

        summary.categoriesMatched.forEach(category => {
            if (this.lastMoveCategories.has(category)) {
                repeatedCategories.push(category);
            }
        });
        if (repeatedCategories.length > 0) {
            multiplier *= MULTIPLIER_REPEAT_CATEGORY;
        }

        const finalScore = Math.round(baseScore * multiplier);
        return { finalScore, multiplier, repeatedCategories };
    }

    private updateMultiplierText(multiplier: number): void {
        if (!this.multiplierText) return;
        if (multiplier > 1.01) {
            this.multiplierText.setText(`Move x${multiplier.toFixed(2)}`);
        } else {
            this.multiplierText.setText('');
        }
    }

    private revealAllCluesForCategory(category: GemCategory): void {
        if (!this.selectedSpecies || this.completedClueCategories.has(category)) return;

        if (category === GemCategory.HABITAT) {
            let clue: CluePayload | null;
            let emitted = 0;
            let guard = 0;
            while ((clue = this.generateRasterHabitatClue()) && guard < 20) {
                EventBus.emit('clue-revealed', clue);
                emitted++;
                guard++;
            }
            if (emitted > 0) {
                this.revealedClues.add(category);
                this.seenClueCategories.add(category);
            }
            this.completedClueCategories.add(category);
            return;
        }

        const config = CLUE_CONFIG[category];
        if (!config) return;

        let emitted = 0;
        let guard = 0;
        let lastClue: string | null = null;
        let clueText = config.getClue(this.selectedSpecies);
        while (clueText && guard < 20) {
            if (clueText === lastClue) {
                break;
            }
            const clueData: CluePayload = {
                category,
                heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                clue: clueText,
                speciesId: this.selectedSpecies.ogc_fid,
                name: config.categoryName,
                icon: config.icon,
                color: config.color
            };
            EventBus.emit('clue-revealed', clueData);
            emitted++;
            guard++;
            lastClue = clueText;
            clueText = config.getClue(this.selectedSpecies);
            if (this.isProgressiveCategory(category) && this.isProgressiveCategoryComplete(category)) {
                break;
            }
        }

        if (emitted > 0) {
            this.revealedClues.add(category);
            this.seenClueCategories.add(category);
        }
        this.completedClueCategories.add(category);
    }

    private revealCluesForCategory(category: GemCategory, desiredCount: number): void {
        if (!this.selectedSpecies || desiredCount <= 0 || this.completedClueCategories.has(category)) return;

        let emitted = 0;

        if (category === GemCategory.HABITAT) {
            for (let i = 0; i < desiredCount; i++) {
                const clue = this.generateRasterHabitatClue();
                if (!clue) {
                    this.completedClueCategories.add(category);
                    break;
                }
                EventBus.emit('clue-revealed', clue);
                emitted++;
            }
            if (emitted > 0) {
                this.revealedClues.add(category);
                this.seenClueCategories.add(category);
            }
            return;
        }

        const config = CLUE_CONFIG[category];
        if (!config) return;

        if (this.isProgressiveCategory(category)) {
            for (let i = 0; i < desiredCount; i++) {
                const clueText = config.getClue(this.selectedSpecies);
                if (!clueText) {
                    this.completedClueCategories.add(category);
                    break;
                }
                const clueData: CluePayload = {
                    category,
                    heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                    clue: clueText,
                    speciesId: this.selectedSpecies.ogc_fid,
                    name: config.categoryName,
                    icon: config.icon,
                    color: config.color
                };
                EventBus.emit('clue-revealed', clueData);
                emitted++;
                if (this.isProgressiveCategoryComplete(category)) {
                    this.completedClueCategories.add(category);
                    break;
                }
            }
            if (emitted > 0) {
                this.revealedClues.add(category);
                this.seenClueCategories.add(category);
            }
            return;
        }

        for (let i = 0; i < desiredCount; i++) {
            const clueText = config.getClue(this.selectedSpecies);
            if (!clueText) {
                this.completedClueCategories.add(category);
                break;
            }
            const clueData: CluePayload = {
                category,
                heading: this.selectedSpecies.comm_name || this.selectedSpecies.sci_name || 'Unknown Species',
                clue: clueText,
                speciesId: this.selectedSpecies.ogc_fid,
                name: config.categoryName,
                icon: config.icon,
                color: config.color
            };
            EventBus.emit('clue-revealed', clueData);
            emitted++;
        }

        if (emitted > 0) {
            this.revealedClues.add(category);
            this.seenClueCategories.add(category);
        }
        if (emitted < desiredCount) {
            this.completedClueCategories.add(category);
        }
    }

    private initializeBoardFromCesium(data: EventPayloads['cesium-location-selected']): void {
        console.log("Game Scene: Received 'cesium-location-selected' data:", data);
        this.canMove = false; // Disable moves during reinitialization
        this.isBoardInitialized = false; // Mark as not ready
        const { width, height } = this.scale;

        if (!this.hasActiveDisplayList()) {
            console.warn('Game Scene: Ignoring board initialization because the scene display list is unavailable.', {
                sceneStatus: this.sys?.settings?.status
            });
            return;
        }

        if (this.statusText && this.statusText.active) {
            this.statusText.setText("Initializing new game board...");
        }

        try {
            // Sort species by ogc_fid (lowest first)
            this.currentSpecies = [...data.species].sort((a, b) => a.ogc_fid - b.ogc_fid);
            this.currentSpeciesIndex = 0;
            this.revealedClues.clear(); // Reset clues for new game
            this.completedClueCategories.clear();
            this.allCluesRevealed = false;
            
            // Reset streak and scoring state for new location
            this.streak = 0;
            this.seenClueCategories.clear();
            this.turnBaseTotalScore = 0;
            this.anyMatchThisTurn = false;
            this.lastMoveCategories.clear();
            this.currentMoveSummary = null;
            this.lastAppliedMoveMultiplier = 1;
            this.updateMultiplierText(1);

            // Reset species tracking counters
            this.clueCountThisSpecies = 0;
            this.incorrectGuessesThisSpecies = 0;
            this.speciesStartTime = Date.now();
            
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
            this.backendPuzzle.resetMoves();

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
            
            // Update owl position after board initialization
            if (this.owl) {
                this.owl.setBoardOffsets(this.boardOffset.x, this.boardOffset.y);
            }
            this.positionPauseButton();
            this.pauseButtonContainer?.setVisible(true);
            if (this.movesText && this.backendPuzzle) {
                this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesUsed()}/${this.backendPuzzle.getMaxMoves()}`);
            }
            
            // Emit initial HUD state
            this.emitHud();

        } catch (error) {
            console.error("Game Scene: Error initializing board from Cesium data:", error);
            if (this.statusText && this.statusText.active) {
                if (this.hasActiveDisplayList()) {
                    this.statusText.destroy();
                }
                this.statusText = null;
            }
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (this.hasActiveDisplayList()) {
                this.statusText = this.add.text(width / 2, height / 2, `Error initializing board:\n${errorMessage}`, {
                    fontSize: '18px',
                    color: '#ff4444',
                    backgroundColor: '#000000cc',
                    align: 'center',
                    padding: { x: 10, y: 5 },
                    wordWrap: { width: width * 0.8 }
                }).setOrigin(0.5).setDepth(100);
            } else {
                console.warn('Game Scene: Skipping error text creation because the display list is unavailable.');
            }
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
        
        // Responsive breakpoints
        const MOBILE_BREAKPOINT = 768;
        const MAX_GEM_SIZE = 80; // Maximum gem size for desktop
        const MIN_GEM_SIZE = 24; // Minimum gem size for very small screens
        
        // Determine if we're on mobile or desktop
        const isMobile = width < MOBILE_BREAKPOINT;
        
        // Calculate usable space with different factors for mobile vs desktop
        const usableWidth = isMobile ? width * 0.95 : width * 0.85;
        const usableHeight = height * 0.7875; // Adjusted for 7 rows to maintain aspect ratio
        
        // Calculate gem size based on available space
        const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
        const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
        
        // Use the smaller dimension but apply max/min constraints
        const calculatedSize = Math.min(sizeFromWidth, sizeFromHeight);
        this.gemSize = Math.max(MIN_GEM_SIZE, Math.min(calculatedSize, MAX_GEM_SIZE));
        
        // Calculate actual board dimensions
        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        
        // Position board based on screen size
        // Calculate owl scale dynamically based on gem size
        const referenceGemSize = 58;
        const baseOwlScale = 2.5;
        const dynamicOwlScale = (this.gemSize / referenceGemSize) * baseOwlScale;
        const owlHeight = 32 * dynamicOwlScale;
        const requiredTopMargin = Math.max(0, Math.round(owlHeight - 9));
        const maxTopMargin = Math.max(height - boardHeight, 0);
        const minTopMargin = Math.min(requiredTopMargin, maxTopMargin);
        const preferredTop = Math.round((height - boardHeight) / 2);
        const topOffset = Phaser.Math.Clamp(preferredTop, minTopMargin, maxTopMargin);

        // Always center the board horizontally regardless of screen size
        this.boardOffset = {
            x: Math.round((width - boardWidth) / 2),
            y: topOffset
        };
        
        console.log(`Board dimensions calculated: ${isMobile ? 'Mobile' : 'Desktop'} mode, gem size: ${this.gemSize}, position: (${this.boardOffset.x}, ${this.boardOffset.y})`);
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
        if (this.multiplierText) {
            this.multiplierText.setPosition(20, height - 55);
        }
        this.positionPauseButton();
        
        // Update owl scale and position on resize
        if (this.owl) {
            // Calculate new owl scale based on current gem size
            const referenceGemSize = 58;
            const baseOwlScale = 2.5;
            const newOwlScale = (this.gemSize / referenceGemSize) * baseOwlScale;
            
            // Update owl scale and position
            this.owl.setScale(newOwlScale);
            this.owl.setBoardOffsets(this.boardOffset.x, this.boardOffset.y);
        }
        
        if (this.boardView) {
            this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);
        }
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (this.isPaused) return;
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
        if (this.isPaused) return;
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
        if (this.isPaused) return;
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
                    this.isResolvingMove = true;
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
            this.isResolvingMove = false;
            if (!this.isPaused && this.backendPuzzle && !this.backendPuzzle.isGameOver()) {
                this.canMove = true;
            }
        }
    }

    private async applyMoveAndHandleResults(moveAction: MoveAction): Promise<void> {
        if (!this.backendPuzzle || !this.boardView) return;
        
        // Reset turn tracking
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        this.currentMoveSummary = this.createEmptyMoveSummary();
        
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

        let multiplier = 1;
        if (this.anyMatchThisTurn) {
            const { finalScore, multiplier: computedMultiplier, repeatedCategories } = this.applyMoveBonuses(this.turnBaseTotalScore);
            multiplier = computedMultiplier;
            const bonus = Math.max(0, finalScore - this.turnBaseTotalScore);
            if (bonus > 0) {
                this.backendPuzzle.addBonusScore(bonus);
            }
            repeatedCategories.forEach(category => this.revealAllCluesForCategory(category));
            this.turnBaseTotalScore = finalScore;
        } else {
            multiplier = 1;
        }

        this.lastMoveCategories = this.currentMoveSummary ? new Set(this.currentMoveSummary.categoriesMatched) : new Set();
        this.currentMoveSummary = null;

        // Move is fully resolved, apply turn resolution
        this.onMoveResolved(this.turnBaseTotalScore, this.anyMatchThisTurn, multiplier);

        // Reset flags for next move
        this.anyMatchThisTurn = false;
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
            if (this.currentMoveSummary) {
                this.currentMoveSummary.cascades += 1;
            }
            
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

        this.recordMatchesForSummary(matches, originalGridState);

        const categoryMaxMatch = new Map<GemCategory, number>();

        for (const match of matches) {
            if (match.length === 0) continue;
            const [firstX, firstY] = match[0];
            const gem = originalGridState[firstX]?.[firstY];
            if (!gem) continue;
            const category = this.gemTypeToCategory(gem.gemType);
            if (category === null) continue;
            const current = categoryMaxMatch.get(category) ?? 0;
            if (match.length > current) {
                categoryMaxMatch.set(category, match.length);
            }
        }

        categoryMaxMatch.forEach((maxLength, category) => {
            if (maxLength >= MOVE_HUGE_MATCH_THRESHOLD) {
                this.revealAllCluesForCategory(category);
            } else {
                const cluesToReveal = maxLength >= MOVE_LARGE_MATCH_THRESHOLD ? 2 : 1;
                this.revealCluesForCategory(category, cluesToReveal);
            }
        });
    }

    private processMatchedGemsForClues(matches: Coordinate[][]): void {
        if (!this.selectedSpecies || matches.length === 0) return;

        this.recordMatchesForSummary(matches, this.backendPuzzle?.getGridState());

        const categoryMaxMatch = new Map<GemCategory, number>();

        if (this.backendPuzzle) {
            const gridState = this.backendPuzzle.getGridState();
            for (const match of matches) {
                if (match.length === 0) continue;
                const [firstX, firstY] = match[0];
                const gem = gridState[firstX]?.[firstY];
                if (!gem) continue;
                const category = this.gemTypeToCategory(gem.gemType);
                if (category === null) continue;
                const current = categoryMaxMatch.get(category) ?? 0;
                if (match.length > current) {
                    categoryMaxMatch.set(category, match.length);
                }
            }
        }

        categoryMaxMatch.forEach((maxLength, category) => {
            if (maxLength >= MOVE_HUGE_MATCH_THRESHOLD) {
                this.revealAllCluesForCategory(category);
            } else {
                const cluesToReveal = maxLength >= MOVE_LARGE_MATCH_THRESHOLD ? 2 : 1;
                this.revealCluesForCategory(category, cluesToReveal);
            }
        });

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

            // Reset species tracking counters for new species
            this.clueCountThisSpecies = 0;
            this.incorrectGuessesThisSpecies = 0;
            this.speciesStartTime = Date.now();

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

            // Track discovery if authenticated
            if (this.currentUserId && this.backendPuzzle) {
                this.trackDiscovery(data.speciesId);
            }

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
            this.incorrectGuessesThisSpecies++;
            this.onWrongGuess();
        }
    }

    private async trackDiscovery(speciesId: number): Promise<void> {
        if (this.discoveredSpeciesIds.has(speciesId)) {
            console.log('Game Scene: Species discovery already tracked locally. Skipping duplicate persistence.', { speciesId });
            this.resetSpeciesTrackingCounters();
            return;
        }

        this.discoveredSpeciesIds.add(speciesId);

        try {
            const {
                trackSpeciesDiscovery,
                calculateTimeToDiscover,
                forceSessionUpdate
            } = await import('@/lib/playerTracking');

            const timeToDiscover = calculateTimeToDiscover();

            const discoveryId = await trackSpeciesDiscovery(
                this.currentUserId!,
                speciesId,
                {
                    sessionId: this.currentSessionId || undefined,
                    timeToDiscoverSeconds: timeToDiscover || undefined,
                    cluesUnlockedBeforeGuess: this.clueCountThisSpecies,
                    incorrectGuessesCount: this.incorrectGuessesThisSpecies,
                    scoreEarned: this.backendPuzzle!.getScore()
                }
            );

            if (discoveryId) {
                console.log('Species discovery tracked:', discoveryId);

                // Force immediate session update (critical event)
                if (this.currentSessionId) {
                    await forceSessionUpdate(
                        this.currentSessionId,
                        this.backendPuzzle!.getMovesUsed(),
                        this.backendPuzzle!.getScore(),
                        this.currentSpeciesIndex + 1, // +1 because we just discovered one
                        this.revealedClues.size
                    );
                }
            }
        } catch (error) {
            console.error('Failed to track species discovery:', error);
        } finally {
            this.resetSpeciesTrackingCounters();
        }
    }

    private resetForNewLocation(): void {
        console.log("Game Scene: Resetting for new location selection");
        
        // Clear current species data
        this.currentSpecies = [];
        this.selectedSpecies = null;
        this.currentSpeciesIndex = 0;
        this.revealedClues.clear();
        this.completedClueCategories.clear();
        this.allCluesRevealed = false;
        this.rasterHabitats = [];
        this.usedRasterHabitats.clear();
        this.lastMoveCategories.clear();
        this.currentMoveSummary = null;
        this.lastAppliedMoveMultiplier = 1;
        this.updateMultiplierText(1);
        this.pauseButtonContainer?.setVisible(false);
        
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
        this.lastMoveCategories.clear();
        this.currentMoveSummary = null;
        this.lastAppliedMoveMultiplier = 1;
        this.isResolvingMove = false;
        this.backendPuzzle?.resetMoves();
        
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

        // End session if active
        if (this.currentSessionId && this.backendPuzzle) {
            this.endSessionSync();
        }

        // Remove EventBus listeners
        EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
        EventBus.off('species-guess-submitted', this.handleSpeciesGuess, this);
        EventBus.off(EVT_GAME_RESTART, this.handleRestart, this);

        // Remove player tracking listeners if they exist
        if (this.currentUserId) {
            EventBus.off('clue-revealed', this.handleClueRevealed, this);
            EventBus.off(EVT_GAME_HUD_UPDATED, this.handleHudUpdate, this);

            // Remove beforeunload handler
            if (typeof window !== 'undefined') {
                window.removeEventListener('beforeunload', this.handleBeforeUnload);
            }
        }

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
        if (this.multiplierText) {
            this.multiplierText.destroy();
            this.multiplierText = null;
        }
        if (this.pauseButtonContainer) {
            this.pauseButtonContainer.destroy(true);
            this.pauseButtonContainer = null;
        }
        this.pauseButton = null;
        this.pauseButtonLabel = null;
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy(true);
            this.pauseOverlay = null;
        }
        this.pauseOverlayBackground = null;
        this.pauseOverlayTitle = null;
        this.pauseOverlayResumeButton = null;
        this.isPaused = false;
        this.canMoveBeforePause = false;

        this.resetDragState(); // Clear drag state variables
        this.canMove = false;
        this.isBoardInitialized = false;
        
        // Reset species data
        this.currentSpecies = [];
        this.selectedSpecies = null;
        this.revealedClues.clear();
        this.completedClueCategories.clear();
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

        // Clear tracking state
        this.currentUserId = null;
        this.currentSessionId = null;
        this.clueCountThisSpecies = 0;
        this.incorrectGuessesThisSpecies = 0;
        this.speciesStartTime = 0;

        // Emit game reset event
        EventBus.emit('game-reset', undefined);

        console.log("Game Scene: Shutdown complete.");
    }

    private endSessionSync(): void {
        // Fire-and-forget session end (don't await in shutdown)
        import('@/lib/playerTracking').then(({ endGameSession }) => {
            if (this.currentSessionId && this.backendPuzzle) {
                endGameSession(
                    this.currentSessionId,
                    this.backendPuzzle.getMovesUsed(),
                    this.backendPuzzle.getScore()
                ).catch(error => {
                    console.error('Failed to end session:', error);
                });
            }
        });
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
