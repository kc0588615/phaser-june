// Game scene — the expedition board.
//
// Responsibilities, in one place:
//   - drive the shared board engine (board/BoardController.ts: pointer input,
//     move + cascade loop) and give it expedition meaning through hooks
//   - score the move (streaks, multipliers from constants.ts) and emit HUD
//     updates over the EventBus
//   - listen for expedition events ('map-location-selected',
//     'expedition-start') to configure the board for the current node
//     (spawn weights, obstacles, objective), and emit
//     evidence progress/checkpoints back to React.
//
// If you are new here: read BackendPuzzle.ts first (the rules), then
// board/BoardController.ts (input + move loop), then the hooks below
// (beginMoveTurn -> recordPhase -> finishMoveTurn).
import Phaser from 'phaser';
import { BackendPuzzle } from '../BackendPuzzle';
import { MoveAction, MoveDirection } from '../MoveAction';
import { BoardView } from '../BoardView';
import {
    GRID_COLS, GRID_ROWS, AssetKeys,
    STREAK_STEP, STREAK_CAP,
    MAX_MOVES,
    MOVE_LARGE_MATCH_THRESHOLD,
    MOVE_HUGE_MATCH_THRESHOLD,
    MULTIPLIER_LARGE_MATCH,
    MULTIPLIER_HUGE_MATCH,
    DEFAULT_BOARD_SPAWN_CONFIG,
} from '../constants';
import { EventBus, EventPayloads, EVT_GAME_HUD_UPDATED } from '../EventBus';
import { ExplodeAndReplacePhase, Coordinate } from '../ExplodeAndReplacePhase';
import { GemType } from '../constants';
import {
  buildNodeBoardContext,
} from '../nodeObstacles';
import { GEM_EVIDENCE_FAMILIES, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { getExpeditionBoardSafeArea } from '../expeditionHudLayout';
import { applyFieldSignalMatch, buildFieldSignalSeed, FIELD_SIGNAL_BLOCKER_ID } from '../fieldSignal';
import { attachDebugScene, detachDebugScene, type DebugBoardSnapshot } from '@/game/debugBridge';
import { BoardController } from '@/game/board/BoardController';

interface BoardOffset {
    x: number;
    y: number;
}

interface MoveSummary {
    largestMatch: number;
    matchGroups: number;
    gemTypesMatched: Set<GemType>;
    cascades: number;
    directEvidenceCells: Map<string, EvidenceFamily>;
    directMatchFamilies: EvidenceFamily[];
    signalClearedFamily?: EvidenceFamily;
    /** Length of the direct match that cleared the field signal; 4+ pays two soft hints. */
    signalClearMatchLength?: number;
}

export class Game extends Phaser.Scene {
    // --- MVC Components ---
    private backendPuzzle: BackendPuzzle | null = null;
    private boardView: BoardView | null = null;

    // --- Board engine: pointer input + move/cascade loop (board/BoardController.ts) ---
    private controller: BoardController | null = null;

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
    private shuffleButtonContainer: Phaser.GameObjects.Container | null = null;
    private pauseOverlay: Phaser.GameObjects.Container | null = null;
    private pauseOverlayBackground: Phaser.GameObjects.Rectangle | null = null;
    private pauseOverlayTitle: Phaser.GameObjects.Text | null = null;
    private pauseOverlayResumeButton: Phaser.GameObjects.Text | null = null;
    private isPaused: boolean = false;
    private canMoveBeforePause: boolean = false;
    
    // --- Player Tracking ---
    private currentSessionId: string | null = null; // Active session
    
    // --- Streak and Scoring ---
    private streak: number = 0;
    private turnBaseTotalScore: number = 0; // Accumulator for the current turn
    private anyMatchThisTurn: boolean = false; // Track if any match occurred this turn
    private currentMoveSummary: MoveSummary | null = null;
    private lastAppliedMoveMultiplier: number = 1;

    // Expedition run state — when true, node-complete advances to the next v3 board.
    private inExpeditionRun: boolean = false;

    // Node objective tracking (six evidence moves per research site)
    private nodeObjectiveTarget: number = 0;
    private nodeObjectiveProgress: number = 0;
    private nodeObjectiveCompleted: boolean = false;
    private currentNodeIndex: number = 0;
    private currentBoardSeed: number | null = null;

    constructor() {
        super('Game');
    }

    private hasActiveDisplayList(): boolean {
        const factory = this.add as Phaser.GameObjects.GameObjectFactory & { displayList?: Phaser.GameObjects.DisplayList | null };
        const displayList = factory?.displayList ?? null;
        const status = this.sys?.settings?.status ?? Phaser.Scenes.DESTROYED;
        return !!displayList && status < Phaser.Scenes.SHUTDOWN;
    }


    private emitNodeObjectiveUpdated(): void {
        EventBus.emit('node-objective-updated', {
            progress: this.nodeObjectiveProgress,
            target: this.nodeObjectiveTarget,
        });
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
        if (this.backendPuzzle.isGameOver() && this.controller?.isInputEnabled() && !this.isPaused) {
            // Expedition boards never reach here: input stays disabled after the
            // sixth move until the evidence choice advances the run.
            if (this.inExpeditionRun) return;
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
        this.controller?.setInputEnabled(false);
    }

    private setBoardInitialized(ready: boolean): void {
        this.isBoardInitialized = ready;
        this.controller?.setReady(ready);
    }

    private handleEvidenceProgressCommitted(data: EventPayloads['evidence-progress-committed']): void {
        if (data.nodeIndex !== this.currentNodeIndex || !this.backendPuzzle
            || data.moveNumber !== this.backendPuzzle.getMovesUsed()) return;
        if (data.moveNumber >= 6 || this.controller?.isResolving()) return;
        // Commit can land while paused; remember to re-enable on unpause.
        if (this.isPaused) this.canMoveBeforePause = true;
        else this.controller?.setInputEnabled(true);
    }

    private onMoveResolved(
        didAnyMatch: boolean,
        moveMultiplier: number,
        evidenceTelemetry?: {
            move: { rowOrCol: MoveDirection; index: number; amount: number };
        },
    ): void {
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

        if (didAnyMatch && evidenceTelemetry) {
            this.nodeObjectiveProgress = this.backendPuzzle.getMovesUsed();
            this.emitNodeObjectiveUpdated();
            this.disableInputs();
            EventBus.emit('evidence-move-resolved', {
                nodeIndex: this.currentNodeIndex,
                moveNumber: this.backendPuzzle.getMovesUsed(),
                ...evidenceTelemetry,
                boardCheckpoint: this.backendPuzzle.exportCheckpoint(),
            });
            return;
        }

        // Non-expedition boards still end via GameOver when moves run out.
        if (this.backendPuzzle.isGameOver()) {
            if (this.inExpeditionRun) return;
            this.disableInputs();
            this.emitHud();
            const finalScore = this.backendPuzzle.getScore();
            this.time.delayedCall(100, () => {
                this.scene.start('GameOver', { score: finalScore });
            });
        }
    }

    create(): void {
        console.log("Game Scene: create");
        const { width, height } = this.scale;

        if (this.textures.exists(AssetKeys.BACKGROUND)) {
            this.add.image(width / 2, height / 2, AssetKeys.BACKGROUND).setOrigin(0.5).setAlpha(0.5).setDepth(-2);
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

        this.statusText = this.add.text(width / 2, height / 2, "Welcome to Critter Connect!\n\nPick a spot on the map and start an expedition.\n\nMatch gems at each site to gather evidence,\nthen name the mystery species. Good luck!", {
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

        this.calculateBoardDimensions();

        // Initialize BackendPuzzle and BoardView, but board visuals are created later
        this.backendPuzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
        
        // Initialize streak and scoring state
        this.streak = 0;
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        this.boardView = new BoardView(this, {
            cols: GRID_COLS,
            rows: GRID_ROWS,
            gemSize: this.gemSize,
            boardOffset: this.boardOffset
        });
        this.createPauseControls();

        this.controller = new BoardController(this, this.backendPuzzle, this.boardView, { gemSize: this.gemSize, offset: this.boardOffset }, {
            onMoveStart: () => this.beginMoveTurn(),
            onPhase: (phase, cascade) => this.recordPhase(phase, cascade),
            onMoveResolved: move => this.finishMoveTurn(move),
            onTap: (x, y) => {
                const selection = this.boardView?.terrainSelectionAt(x, y);
                if (selection) EventBus.emit('terrain-cell-selected', selection);
            },
            // An expedition move waits for the server's evidence commit before input returns.
            shouldResumeInput: committed => !(committed && this.inExpeditionRun) && !this.isPaused
                && !!this.backendPuzzle && !this.backendPuzzle.isGameOver() && !this.nodeObjectiveCompleted,
        });
        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('map-location-selected', this.initializeBoardFromMap, this);
        EventBus.on('terrain-cell-selected', this.handleTerrainSelection, this);
        EventBus.on('node-complete', this.handleNodeComplete, this);
        EventBus.on('expedition-start', this.onExpeditionStart, this);
        EventBus.on('game-reset', this.onGameReset, this);
        EventBus.on('evidence-progress-committed', this.handleEvidenceProgressCommitted, this);
        EventBus.on('routing-state-updated', this.handleRoutingState, this);
        

        this.setBoardInitialized(false); // Input stays off until map data builds the board

        EventBus.emit('current-scene-ready', this);
        attachDebugScene(this);

        // Initialize player tracking
        this.initializePlayerTracking();

        // Bind shutdown to Phaser scene lifecycle so listeners are cleaned on stop/restart/HMR
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

        console.log("Game Scene: Create method finished. Waiting for map data.");
    }

    private handleAuthUserReady = (data: { playerId: string; sessionId?: string }) => {
        this.currentSessionId = data.sessionId ?? null;
    };

    private initializePlayerTracking(): void {
        this.currentSessionId = null;
        EventBus.on('auth-user-ready', this.handleAuthUserReady, this);
    }

    private createPauseControls(): void {
        if (this.pauseButtonContainer) {
            this.pauseButtonContainer.destroy(true);
            this.pauseButtonContainer = null;
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

        this.ensurePauseOverlay();
        this.createShuffleButton();
        this.positionPauseButton();
    }

    private createShuffleButton(): void {
        if (this.shuffleButtonContainer) {
            this.shuffleButtonContainer.destroy(true);
            this.shuffleButtonContainer = null;
        }
        const sz = 36;
        const bg = this.add.rectangle(0, 0, sz, sz, 0x000000, 0.45)
            .setStrokeStyle(2, 0xf59e0b)
            .setDepth(110);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x111111, 0.6));
        bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.45));
        bg.on('pointerup', () => this.handleShuffle());

        const label = this.add.text(0, 0, '🔀', {
            fontSize: '18px',
        }).setOrigin(0.5).setDepth(111);

        const container = this.add.container(0, 0, [bg, label]).setDepth(110);
        container.setScrollFactor(0);
        container.setVisible(this.isBoardInitialized);
        this.shuffleButtonContainer = container;
    }

    private handleShuffle(): void {
        if (this.inExpeditionRun || !this.backendPuzzle || !this.boardView || !this.controller?.isInputEnabled() || this.isPaused) return;
        this.backendPuzzle.shuffle();
        this.boardView.destroyBoard();
        this.boardView.createBoard(this.backendPuzzle.getGridState());
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
        this.controller?.setPaused(shouldPause);

        if (shouldPause) {
            this.canMoveBeforePause = this.controller?.isInputEnabled() ?? false;
            this.controller?.setInputEnabled(false);
            this.pauseButtonContainer?.setVisible(false);
            this.shuffleButtonContainer?.setVisible(false);
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
            this.shuffleButtonContainer?.setVisible(!this.inExpeditionRun);
            if (this.backendPuzzle && !this.backendPuzzle.isGameOver() && !this.controller?.isResolving() && this.canMoveBeforePause && !this.nodeObjectiveCompleted) {
                this.controller?.setInputEnabled(true);
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
        // Shuffle button sits to the left of pause
        if (this.shuffleButtonContainer) {
            this.shuffleButtonContainer.setPosition(x - 44, y);
        }
        this.updatePauseOverlayLayout();
    }

    private createEmptyMoveSummary(): MoveSummary {
        return {
            largestMatch: 0,
            matchGroups: 0,
            gemTypesMatched: new Set(),
            cascades: 0,
            directEvidenceCells: new Map(),
            directMatchFamilies: [],
        };
    }

    private recordMatchesForSummary(matches: Coordinate[][], gridState: any, isCascade: boolean): void {
        if (!matches || matches.length === 0) return;

        const state = gridState ?? this.backendPuzzle?.getGridState();
        if (!state) return;

        const summary = this.currentMoveSummary;
        if (summary) {
            summary.matchGroups += matches.length;
        }

        const groups = matches.flatMap(match => {
            const gemType = match.map(([x, y]) => state[x]?.[y]?.gemType).find(Boolean);
            return gemType ? [{ gemType, size: match.length }] : [];
        });
        if (groups.length > 0) EventBus.emit('gems-matched', { groups, cascade: isCascade });

        for (const match of matches) {
            if (summary && match.length > summary.largestMatch) {
                summary.largestMatch = match.length;
            }

            let matchGemType: GemType | null = null;

            for (const [x, y] of match) {
                const gem = state[x]?.[y];
                if (!gem?.gemType) continue;
                matchGemType = gem.gemType;

                if (summary) {
                    summary.gemTypesMatched.add(gem.gemType);
                    if (!isCascade) {
                        const family = GEM_EVIDENCE_FAMILIES[gem.gemType as GemType];
                        if (family) summary.directEvidenceCells.set(`${x},${y}`, family);
                    }
                }
            }

            if (summary && !isCascade && matchGemType) {
                const family = GEM_EVIDENCE_FAMILIES[matchGemType];
                if (family) summary.directMatchFamilies.push(family);
            }

            // Damage adjacent blockers when a match clears nearby
            if (this.backendPuzzle && match.length > 0) {
                const adjacentBlockerCoords = new Set<string>();
                for (const [mx, my] of match) {
                    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]] as const) {
                        const nx = mx + dx, ny = my + dy;
                        const key = `${nx},${ny}`;
                        if (!adjacentBlockerCoords.has(key) && !match.some(([cx, cy]) => cx === nx && cy === ny)) {
                            adjacentBlockerCoords.add(key);
                            const adjacentCell = state[nx]?.[ny];
                            if (adjacentCell?.state?.blockerId === FIELD_SIGNAL_BLOCKER_ID) {
                                const payout = applyFieldSignalMatch(this.backendPuzzle, matchGemType, match.length, isCascade);
                                if (payout && summary && match.length > (summary.signalClearMatchLength ?? 0)) {
                                    summary.signalClearedFamily = payout.family;
                                    summary.signalClearMatchLength = match.length;
                                }
                            } else {
                                this.backendPuzzle.damageBlocker(nx, ny);
                            }
                        }
                    }
                }
            }
        }
    }

    private applyMoveBonuses(baseScore: number): { finalScore: number; multiplier: number } {
        if (!this.currentMoveSummary || baseScore <= 0 || !this.anyMatchThisTurn) {
            return { finalScore: baseScore, multiplier: 1 };
        }

        // Only match-size bonuses remain — they align with the evidence-tier
        // chase. Category-pattern multipliers were invisible strategy and cut.
        let multiplier = 1;
        const summary = this.currentMoveSummary;

        if (summary.largestMatch >= MOVE_HUGE_MATCH_THRESHOLD) {
            multiplier *= MULTIPLIER_HUGE_MATCH;
        } else if (summary.largestMatch >= MOVE_LARGE_MATCH_THRESHOLD) {
            multiplier *= MULTIPLIER_LARGE_MATCH;
        }

        const finalScore = Math.round(baseScore * multiplier);
        return { finalScore, multiplier };
    }

    private updateMultiplierText(multiplier: number): void {
        if (!this.multiplierText) return;
        if (multiplier > 1.01) {
            this.multiplierText.setText(`Move x${multiplier.toFixed(2)}`);
        } else {
            this.multiplierText.setText('');
        }
    }


    private initializeBoardFromMap(data: EventPayloads['map-location-selected']): void {
        console.log("Game Scene: Received 'map-location-selected' data:", data);
        this.controller?.setInputEnabled(false); // Disable moves during reinitialization
        this.setBoardInitialized(false);
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
            // Reset streak and scoring state for new location
            this.streak = 0;
            this.turnBaseTotalScore = 0;
            this.anyMatchThisTurn = false;
            this.currentMoveSummary = null;
            this.lastAppliedMoveMultiplier = 1;
            this.updateMultiplierText(1);
            
            // Initialize node objective from expedition data
            this.scoreText?.setVisible(false);
            this.multiplierText?.setVisible(false);
            this.movesText?.setVisible(false);
            this.nodeObjectiveTarget = 6;
            this.nodeObjectiveProgress = Phaser.Math.Clamp(data.objectiveProgress ?? 0, 0, this.nodeObjectiveTarget);
            this.nodeObjectiveCompleted = false;
            this.currentNodeIndex = data.nodeIndex ?? 0;
            this.currentBoardSeed = data.boardSeed ?? null;

            // Expedition boards always carry a nodeIndex; free-play clicks never
            // do. Deriving from the payload also covers run resume, which
            // re-emits the board without an 'expedition-start' event.
            if (data.nodeIndex !== undefined) this.inExpeditionRun = true;

            if (!this.backendPuzzle || !this.boardView) throw new Error('Board was not created');
            // Configure board spawning for action-first expedition nodes.
            this.backendPuzzle.setGemPool(data.boardConfig ?? DEFAULT_BOARD_SPAWN_CONFIG);
            if (data.boardSeed !== undefined) {
                this.backendPuzzle.setSeed(data.boardSeed);
            }
            const restoringCheckpoint = data.boardCheckpoint;
            if (restoringCheckpoint) this.backendPuzzle.importCheckpoint(restoringCheckpoint);
            else this.backendPuzzle.regenerateBoard();
            const boardContext = data.boardContext ?? buildNodeBoardContext({
                width: GRID_COLS,
                height: GRID_ROWS,
                obstacles: data.obstacles ?? [],
                nodeIndex: data.nodeIndex ?? 0,
            });
            if (!restoringCheckpoint) {
                this.backendPuzzle.applyCellStateSeeds(boardContext.obstacleSeeds);
                this.backendPuzzle.resetMoves();
            }
            // Expedition mystery boards use a fixed fast pocket-game move budget.
            if (!restoringCheckpoint && data.moveBudget && data.moveBudget > 0) {
                this.backendPuzzle.setMaxMoves(data.moveBudget);
            } else if (!restoringCheckpoint && data.difficulty && data.difficulty >= 1) {
                const difficultyMoves = [50, 40, 30, 25, 20];
                const moves = difficultyMoves[Math.min(data.difficulty - 1, 4)] ?? MAX_MOVES;
                this.backendPuzzle.setMaxMoves(moves);
            } else if (!restoringCheckpoint) {
                this.backendPuzzle.setMaxMoves(MAX_MOVES);
            }

            this.calculateBoardDimensions(); // Recalculate for current scale

            // Update boardView dimensions without animating (board will be recreated)
            this.boardView.updateDimensions(this.gemSize, this.boardOffset);
            this.boardView.setEvidenceFamilyMode(true);
            this.boardView.setTerrain(data.terrain);

            // Destroy old board sprites and create new ones based on the (potentially new) backendPuzzle state
            if (this.boardView.destroyBoard) this.boardView.destroyBoard();
            this.boardView.createBoard(this.backendPuzzle.getGridState());

            if (this.statusText && this.statusText.active) {
                this.statusText.destroy();
                this.statusText = null;
            }
            this.setBoardInitialized(true);
            this.controller?.setInputEnabled(true); // Board is ready, enable input
            console.log("Game Scene: Board initialized with random gems. Input enabled.");

            this.positionPauseButton();
            this.pauseButtonContainer?.setVisible(true);
            this.shuffleButtonContainer?.setVisible(!this.inExpeditionRun);
            if (this.movesText && this.backendPuzzle) {
                this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesUsed()}/${this.backendPuzzle.getMaxMoves()}`);
            }
            
            // Emit initial HUD state
            this.emitHud();

        } catch (error) {
            console.error("Game Scene: Error initializing board from map data:", error);
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
            this.controller?.setInputEnabled(false);
            this.setBoardInitialized(false);
        }
    }

    private calculateBoardDimensions(): void {
        const { width, height } = this.scale;
        if (width <= 0 || height <= 0) {
            console.warn("Invalid scale dimensions.");
            return;
        }
        
        const MAX_GEM_SIZE = 80; // Maximum gem size for desktop
        const MIN_GEM_SIZE = 24; // Minimum gem size for very small screens

        const safeArea = getExpeditionBoardSafeArea(width);
        const usableWidth = Math.max(180, width - safeArea.left - safeArea.right - 24);
        const usableHeight = Math.max(170, height - safeArea.top - safeArea.bottom);
        
        // Calculate gem size based on available space
        const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
        const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
        
        // Use the smaller dimension but apply max/min constraints
        const calculatedSize = Math.min(sizeFromWidth, sizeFromHeight);
        this.gemSize = Math.max(MIN_GEM_SIZE, Math.min(calculatedSize, MAX_GEM_SIZE));
        
        // Calculate actual board dimensions
        const boardWidth = GRID_COLS * this.gemSize;
        const boardHeight = GRID_ROWS * this.gemSize;
        
        const maxTopMargin = Math.max(height - boardHeight - safeArea.bottom, safeArea.top);
        const minTopMargin = Math.min(safeArea.top, maxTopMargin);
        const preferredTop = Math.round(safeArea.top + (usableHeight - boardHeight) / 2);
        const topOffset = Phaser.Math.Clamp(preferredTop, minTopMargin, maxTopMargin);

        const boardAreaWidth = width - safeArea.left - safeArea.right;
        this.boardOffset = {
            x: Math.round(safeArea.left + (boardAreaWidth - boardWidth) / 2),
            y: topOffset
        };
        
        this.controller?.setLayout({ gemSize: this.gemSize, offset: this.boardOffset });
        console.log(`Board dimensions calculated: ${safeArea.dualRail ? 'Dual rail' : 'Dock'} mode, gem size: ${this.gemSize}, position: (${this.boardOffset.x}, ${this.boardOffset.y})`);
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

        if (this.boardView) {
            this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);
        }
    }

    private handleTerrainSelection(selection: EventPayloads['terrain-cell-selected']): void {
        this.boardView?.selectTerrain(selection);
    }

    private handleRoutingState(view: EventPayloads['routing-state-updated']): void {
        this.boardView?.setRouting(view);
    }

    private beginMoveTurn(): void {
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        this.currentMoveSummary = this.createEmptyMoveSummary();
    }

    /** One explode phase (the move, then each cascade), before it animates. */
    private recordPhase(phase: ExplodeAndReplacePhase, isCascade: boolean): void {
        if (!this.backendPuzzle) return;
        this.turnBaseTotalScore += this.backendPuzzle.calculatePhaseBaseScore(phase);
        this.anyMatchThisTurn = true;
        if (isCascade && this.currentMoveSummary) this.currentMoveSummary.cascades += 1;
        this.recordMatchesForSummary(phase.matches, phase.matchGridState, isCascade);
    }

    /** The move and its cascades have settled: bonuses, field signal, telemetry. */
    private finishMoveTurn(moveAction: MoveAction): void {
        if (!this.backendPuzzle) return;

        let multiplier = 1;
        if (this.anyMatchThisTurn) {
            const { finalScore, multiplier: computedMultiplier } = this.applyMoveBonuses(this.turnBaseTotalScore);
            multiplier = computedMultiplier;
            const bonus = Math.max(0, finalScore - this.turnBaseTotalScore);
            if (bonus > 0) {
                this.backendPuzzle.addBonusScore(bonus);
            }
        }

        const evidenceTelemetry = this.inExpeditionRun && this.currentMoveSummary
            ? {
                move: { rowOrCol: moveAction.rowOrCol, index: moveAction.index, amount: moveAction.amount },
            }
            : undefined;
        this.placeFieldSignalAfterCascade();
        this.currentMoveSummary = null;

        this.onMoveResolved(this.anyMatchThisTurn, multiplier, evidenceTelemetry);
        this.anyMatchThisTurn = false;
    }

    private placeFieldSignalAfterCascade(): void {
        if (!this.backendPuzzle || !this.boardView || !this.currentMoveSummary
            || this.currentMoveSummary.cascades < 1 || this.backendPuzzle.hasFieldSignalSpawned()
            || this.currentBoardSeed === null) return;
        const seed = buildFieldSignalSeed(
            this.backendPuzzle.getGridState(),
            this.currentBoardSeed,
            this.currentNodeIndex,
            this.backendPuzzle.getMovesUsed() + 1,
        );
        if (!seed) return;
        this.backendPuzzle.applyCellStateSeeds([seed]);
        this.backendPuzzle.markFieldSignalSpawned();
        this.boardView.syncCellStates(this.backendPuzzle.getGridState());
    }

    private onExpeditionStart(): void { this.inExpeditionRun = true; }
    private onGameReset(): void {
        this.inExpeditionRun = false;
        // Full cleanup when React signals run ended
        this.prepareForNextNode();
        if (this.statusText && this.statusText.active) {
            this.statusText.setText("Pick a spot on the map and start an expedition.");
        }
    }

    private handleNodeComplete(): void {
        // Light reset: clear board between expedition nodes
        this.prepareForNextNode();
    }

    /** Clears board + scoring for next node without showing end-game text. */
    private prepareForNextNode(): void {
        console.log("Game Scene: Preparing for next node");

        // Clear the board visuals
        if (this.boardView) {
            this.boardView.destroyBoard();
        }

        // Reset board/move state (map-location-selected will reinitialize)
        this.controller?.setInputEnabled(false);
        this.setBoardInitialized(false);
        this.pauseButtonContainer?.setVisible(false);
        this.shuffleButtonContainer?.setVisible(false);

        // Reset scoring for new node
        this.streak = 0;
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;
        this.currentMoveSummary = null;
        this.currentBoardSeed = null;
        this.lastAppliedMoveMultiplier = 1;
        this.updateMultiplierText(1);
        this.canMoveBeforePause = false;
        this.backendPuzzle?.resetMoves();

        // Reset HUD text to avoid stale display between nodes
        if (this.scoreText) this.scoreText.setText('Score: 0');
        if (this.movesText) this.movesText.setText('Moves: 0');

        // Reset objective progress
        this.nodeObjectiveTarget = 0;
        this.nodeObjectiveProgress = 0;
        this.nodeObjectiveCompleted = false;
    }

    /** Client-visible board state for the dev playtest bridge (`src/game/debugBridge.ts`). */
    debugSnapshot(): DebugBoardSnapshot {
        const puzzle = this.backendPuzzle;
        return {
            ready: this.isBoardInitialized && !!puzzle,
            canMove: this.controller?.isInputEnabled() ?? false,
            isResolvingMove: this.controller?.isResolving() ?? false,
            isDragging: this.controller?.isDragging() ?? false,
            isPaused: this.isPaused,
            inRun: this.inExpeditionRun,
            nodeIndex: this.currentNodeIndex,
            boardSeed: this.currentBoardSeed,
            movesUsed: puzzle?.getMovesUsed() ?? 0,
            maxMoves: puzzle?.getMaxMoves() ?? 0,
            gameOver: puzzle?.isGameOver() ?? false,
            objective: { progress: this.nodeObjectiveProgress, target: this.nodeObjectiveTarget, completed: this.nodeObjectiveCompleted },
            streak: this.streak,
            hasAnyValidMove: puzzle?.hasAnyValidMove() ?? false,
            gemSize: this.gemSize,
            boardOffset: { ...this.boardOffset },
            grid: puzzle?.getGridState() ?? [],
        };
    }

    debugPuzzle(): BackendPuzzle | null {
        return this.backendPuzzle;
    }

    shutdown(): void {
        console.log("Game Scene: Shutting down...");
        detachDebugScene(this);

        // End session if active
        if (this.currentSessionId && this.backendPuzzle) {
            this.endSessionSync();
        }

        // Remove EventBus listeners
        EventBus.off('map-location-selected', this.initializeBoardFromMap, this);
        EventBus.off('terrain-cell-selected', this.handleTerrainSelection, this);
        EventBus.off('node-complete', this.handleNodeComplete, this);
        EventBus.off('expedition-start', this.onExpeditionStart, this);
        EventBus.off('game-reset', this.onGameReset, this);
        EventBus.off('evidence-progress-committed', this.handleEvidenceProgressCommitted, this);
        EventBus.off('routing-state-updated', this.handleRoutingState, this);
        EventBus.off('auth-user-ready', this.handleAuthUserReady, this);

        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.controller?.destroy();
        this.controller = null;

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
        if (this.shuffleButtonContainer) {
            this.shuffleButtonContainer.destroy(true);
            this.shuffleButtonContainer = null;
        }
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy(true);
            this.pauseOverlay = null;
        }
        this.pauseOverlayBackground = null;
        this.pauseOverlayTitle = null;
        this.pauseOverlayResumeButton = null;
        this.isPaused = false;
        this.canMoveBeforePause = false;

        this.isBoardInitialized = false;
        
        // Reset streak and scoring state
        this.streak = 0;
        this.turnBaseTotalScore = 0;
        this.anyMatchThisTurn = false;

        // Clear tracking state
        this.currentSessionId = null;

        // Emit game reset event
        EventBus.emit('game-reset', undefined);

        console.log("Game Scene: Shutdown complete.");
    }

    private endSessionSync(): void {
        if (!this.currentSessionId || !this.backendPuzzle) return;
        // Fire-and-forget via sendBeacon for reliability during shutdown
        const blob = new Blob([JSON.stringify({
            action: 'endGameSession',
            sessionId: this.currentSessionId,
            finalMoves: this.backendPuzzle.getMovesUsed(),
            finalScore: this.backendPuzzle.getScore(),
        })], { type: 'application/json' });
        navigator.sendBeacon('/api/player/track', blob);
    }

}
