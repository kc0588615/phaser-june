// ClueBoardScene: the Clue Match board. The canvas belongs to the board: a
// centered square, no in-canvas HUD; React owns everything else. The scene
// reports each explode phase's groups ('gems-matched') and obeys
// 'clue-board-setup' / 'clue-board-lock'.
import Phaser from 'phaser';
import { BoardController } from './BoardController';
import { BoardModel, type ExplodePhase } from './BoardModel';
import { BoardView } from './BoardView';
import { GEM_TYPES, GRID_COLS, GRID_ROWS, gemTexture } from './constants';
import { EventBus, type EventPayloads } from './EventBus';
import { squareBoardLayout, type BoardLayout } from './squareLayout';
import { attachDebugScene, detachDebugScene, type DebugBoardSnapshot } from './debugBridge';
import { gemCategory } from '@/clueGame/categories';
import { cluesForMatch } from '@/clueGame/round';

export class ClueBoardScene extends Phaser.Scene {
    static readonly KEY = 'ClueBoard';

    private readonly model = new BoardModel(GRID_COLS, GRID_ROWS);
    private view: BoardView | null = null;
    private controller: BoardController | null = null;
    private layout: BoardLayout = { gemSize: 64, offset: { x: 0, y: 0 } };
    private backdrop: Phaser.GameObjects.Graphics | null = null;
    private seed: number | null = null;

    constructor() {
        super(ClueBoardScene.KEY);
    }

    /** The gem icons (public/assets/evidence/<color>.svg). */
    preload(): void {
        for (const type of GEM_TYPES) this.load.svg(gemTexture(type), `/assets/evidence/${type}.svg`, { width: 128, height: 128 });
        this.load.on('loaderror', (file: Phaser.Loader.File) => console.error(`[ClueBoardScene] Failed to load ${file.url}`));
    }

    create(): void {
        this.layout = squareBoardLayout(this.scale.width, this.scale.height, GRID_COLS, GRID_ROWS);
        this.backdrop = this.add.graphics().setDepth(-1);
        this.drawBackdrop();
        this.view = new BoardView(this, GRID_COLS, GRID_ROWS, this.layout);
        this.controller = new BoardController(this, this.model, this.view, this.layout, {
            onPhase: (phase, cascade) => this.reportMatches(phase, cascade),
            onMoveResolved: () => this.reshuffleIfStuck(),
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('clue-board-setup', this.setupBoard, this);
        EventBus.on('clue-board-lock', this.setLock, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        EventBus.emit('current-scene-ready', this);
        attachDebugScene(this);
    }

    private setupBoard({ seed, allowedGemTypes }: EventPayloads['clue-board-setup']): void {
        if (!this.view || !this.controller) return;
        this.seed = seed;
        this.model.newBoard(seed, allowedGemTypes);
        this.view.createBoard(this.model.getGrid());
        this.controller.ready = true;
    }

    private setLock({ locked }: EventPayloads['clue-board-lock']): void {
        if (this.controller) this.controller.locked = locked;
    }

    private reportMatches(phase: ExplodePhase, cascade: boolean): void {
        for (const group of phase.groups) this.burst(group.cells, gemCategory(group.gemType).color, group.cells.length);
        EventBus.emit('gems-matched', { groups: phase.groups.map(group => ({ gemType: group.gemType, size: group.cells.length })), cascade });
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
        if (!this.view || this.model.hasAnyValidMove()) return;
        this.model.shuffle();
        this.view.createBoard(this.model.getGrid());
        EventBus.emit('clue-board-shuffled', undefined);
    }

    private handleResize(): void {
        this.layout = squareBoardLayout(this.scale.width, this.scale.height, GRID_COLS, GRID_ROWS);
        this.controller?.setLayout(this.layout);
        this.view?.setLayout(this.layout);
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
        return {
            ready: this.controller?.ready ?? false,
            canMove: this.controller?.canMove ?? false,
            locked: this.controller?.locked ?? false,
            isResolvingMove: this.controller?.isResolving ?? false,
            isDragging: this.controller?.isDragging ?? false,
            boardSeed: this.seed,
            movesUsed: this.model.movesUsed,
            hasAnyValidMove: this.seed !== null && this.model.hasAnyValidMove(),
            gemSize: this.layout.gemSize,
            boardOffset: { ...this.layout.offset },
            grid: this.model.getGrid(),
        };
    }

    debugModel(): BoardModel {
        return this.model;
    }

    private shutdown(): void {
        detachDebugScene(this);
        EventBus.off('clue-board-setup', this.setupBoard, this);
        EventBus.off('clue-board-lock', this.setLock, this);
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.view?.destroyBoard();
        this.view = null;
        this.controller = null;
        this.backdrop = null;
    }
}
