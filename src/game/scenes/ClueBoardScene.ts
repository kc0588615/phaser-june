// ClueBoardScene — the Clue Match board. The canvas belongs to the board: the
// layout is a centered square, there is no in-canvas HUD, and React owns
// everything else. The scene reports each matched group ('gems-matched') and
// obeys 'clue-board-setup' / 'clue-board-lock'.
import Phaser from 'phaser';
import { BackendPuzzle } from '../BackendPuzzle';
import { BoardView } from '../BoardView';
import type { ExplodeAndReplacePhase } from '../ExplodeAndReplacePhase';
import { GRID_COLS, GRID_ROWS } from '../constants';
import { EventBus, type EventPayloads } from '../EventBus';
import { BoardController, type BoardLayout } from '../board/BoardController';
import { squareBoardLayout } from '../board/squareLayout';
import { attachDebugScene, detachDebugScene, type DebugBoardSnapshot } from '@/game/debugBridge';
import { gemCategory } from '@/clueGame/categories';
import { cluesForMatch } from '@/clueGame/round';

export class ClueBoardScene extends Phaser.Scene {
    static readonly KEY = 'ClueBoard';

    private puzzle: BackendPuzzle | null = null;
    private view: BoardView | null = null;
    private controller: BoardController | null = null;
    private layout: BoardLayout = { gemSize: 64, offset: { x: 0, y: 0 } };
    private backdrop: Phaser.GameObjects.Graphics | null = null;
    private seed: number | null = null;
    private locked = false;

    constructor() {
        super(ClueBoardScene.KEY);
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#06121a');
        this.layout = squareBoardLayout(this.scale.width, this.scale.height, GRID_COLS, GRID_ROWS);
        this.backdrop = this.add.graphics().setDepth(-1);
        this.drawBackdrop();

        this.puzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
        this.view = new BoardView(this, { cols: GRID_COLS, rows: GRID_ROWS, gemSize: this.layout.gemSize, boardOffset: this.layout.offset });
        this.controller = new BoardController(this, this.puzzle, this.view, this.layout, {
            onPhase: (phase, cascade) => this.reportMatches(phase, cascade),
            onMoveResolved: (_move, anyMatch) => {
                if (anyMatch) this.puzzle?.registerMove();
                this.reshuffleIfStuck();
            },
            shouldResumeInput: () => !this.locked,
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('clue-board-setup', this.setupBoard, this);
        EventBus.on('clue-board-lock', this.setLock, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

        EventBus.emit('current-scene-ready', this);
        attachDebugScene(this);
    }

    private setupBoard({ seed, allowedGemTypes }: EventPayloads['clue-board-setup']): void {
        if (!this.puzzle || !this.view || !this.controller) return;
        this.seed = seed;
        this.puzzle.setGemTypes(allowedGemTypes);
        this.puzzle.setSeed(seed);
        this.puzzle.regenerateBoard();
        this.view.destroyBoard();
        this.view.createBoard(this.puzzle.getGridState());
        this.controller.setReady(true);
        this.controller.setInputEnabled(!this.locked);
    }

    private setLock({ locked }: EventPayloads['clue-board-lock']): void {
        this.locked = locked;
        // A move in flight re-checks the lock when it settles.
        if (this.controller && !this.controller.isResolving()) {
            this.controller.setInputEnabled(!locked && this.controller.isReady());
        }
    }

    private reportMatches(phase: ExplodeAndReplacePhase, cascade: boolean): void {
        const grid = phase.matchGridState ?? this.puzzle?.getGridState();
        if (!grid) return;
        const groups = phase.matches.flatMap(match => {
            const gemType = match.map(([x, y]) => grid[x]?.[y]?.gemType).find(Boolean);
            return gemType ? [{ gemType, size: match.length, cells: match }] : [];
        });
        for (const group of groups) this.burst(group.cells, gemCategory(group.gemType).color, group.size);
        if (groups.length > 0) {
            EventBus.emit('gems-matched', { groups: groups.map(({ gemType, size }) => ({ gemType, size })), cascade });
        }
    }

    /** A colored ring where a group cleared; bigger groups ring wider and call out their extra clues. */
    private burst(cells: Array<[number, number]>, color: string, size: number): void {
        const { gemSize, offset } = this.layout;
        const cx = offset.x + (cells.reduce((sum, [x]) => sum + x, 0) / cells.length + 0.5) * gemSize;
        const cy = offset.y + (cells.reduce((sum, [, y]) => sum + y, 0) / cells.length + 0.5) * gemSize;
        const ring = this.add.circle(cx, cy, gemSize * 0.4)
            .setStrokeStyle(Math.max(3, gemSize * 0.08), Phaser.Display.Color.HexStringToColor(color).color)
            .setDepth(50);
        this.tweens.add({
            targets: ring,
            scale: 1.6 + 0.3 * (size - 3),
            alpha: 0,
            duration: 420,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });

        const extra = cluesForMatch(size) - 1;
        if (extra <= 0) return;
        const label = this.add.text(cx, cy, `+${extra} clue${extra === 1 ? '' : 's'}`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: `${Math.round(gemSize * 0.34)}px`,
            color: color,
            stroke: '#06121a',
            strokeThickness: Math.max(3, Math.round(gemSize * 0.08)),
        }).setOrigin(0.5).setDepth(60).setScale(0.6);
        this.tweens.add({ targets: label, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({
            targets: label,
            y: cy - gemSize * 0.9,
            alpha: 0,
            delay: 420,
            duration: 700,
            ease: 'Cubic.easeIn',
            onComplete: () => label.destroy(),
        });
    }

    private reshuffleIfStuck(): void {
        if (!this.puzzle || !this.view || this.puzzle.hasAnyValidMove()) return;
        this.puzzle.shuffle();
        this.view.destroyBoard();
        this.view.createBoard(this.puzzle.getGridState());
        EventBus.emit('clue-board-shuffled', undefined);
    }

    private handleResize(): void {
        this.layout = squareBoardLayout(this.scale.width, this.scale.height, GRID_COLS, GRID_ROWS);
        this.controller?.setLayout(this.layout);
        this.view?.updateVisualLayout(this.layout.gemSize, this.layout.offset);
        this.drawBackdrop();
    }

    private drawBackdrop(): void {
        if (!this.backdrop) return;
        const { gemSize, offset } = this.layout;
        const width = GRID_COLS * gemSize;
        const height = GRID_ROWS * gemSize;
        const pad = Math.round(gemSize * 0.08);
        this.backdrop.clear();
        this.backdrop.fillStyle(0x0d2830, 0.9).fillRoundedRect(offset.x - pad, offset.y - pad, width + 2 * pad, height + 2 * pad, gemSize * 0.22);
        this.backdrop.lineStyle(2, 0x7dd3fc, 0.18).strokeRoundedRect(offset.x - pad, offset.y - pad, width + 2 * pad, height + 2 * pad, gemSize * 0.22);
        this.backdrop.lineStyle(1, 0x7dd3fc, 0.06);
        for (let i = 1; i < GRID_COLS; i++) this.backdrop.lineBetween(offset.x + i * gemSize, offset.y, offset.x + i * gemSize, offset.y + height);
        for (let j = 1; j < GRID_ROWS; j++) this.backdrop.lineBetween(offset.x, offset.y + j * gemSize, offset.x + width, offset.y + j * gemSize);
    }

    debugSnapshot(): DebugBoardSnapshot {
        const puzzle = this.puzzle;
        return {
            ready: this.controller?.isReady() ?? false,
            canMove: this.controller?.isInputEnabled() ?? false,
            locked: this.locked,
            isResolvingMove: this.controller?.isResolving() ?? false,
            isDragging: this.controller?.isDragging() ?? false,
            boardSeed: this.seed,
            movesUsed: puzzle?.getMovesUsed() ?? 0,
            hasAnyValidMove: puzzle?.hasAnyValidMove() ?? false,
            gemSize: this.layout.gemSize,
            boardOffset: { ...this.layout.offset },
            grid: puzzle?.getGridState() ?? [],
        };
    }

    debugPuzzle(): BackendPuzzle | null {
        return this.puzzle;
    }

    shutdown(): void {
        detachDebugScene(this);
        EventBus.off('clue-board-setup', this.setupBoard, this);
        EventBus.off('clue-board-lock', this.setLock, this);
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.controller?.destroy();
        this.controller = null;
        this.view?.destroyBoard();
        this.view = null;
        this.puzzle = null;
        this.backdrop?.destroy();
        this.backdrop = null;
    }
}
