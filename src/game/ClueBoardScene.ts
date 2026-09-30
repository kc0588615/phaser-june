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
import { sfx } from './sfx';
import { squareBoardLayout, type BoardLayout } from './squareLayout';
import { makeToyTextures } from './toyTextures';
import { attachDebugScene, detachDebugScene, type DebugBoardSnapshot } from './debugBridge';
import { KIND_COLOR, SHORT_LABEL, kindOf } from '@/clueGame/gems';
import { DEFAULT_RULES } from '@/clueGame/questionMatch';

export class ClueBoardScene extends Phaser.Scene {
    static readonly KEY = 'ClueBoard';

    private readonly model = new BoardModel(GRID_COLS, GRID_ROWS);
    private view: BoardView | null = null;
    private controller: BoardController | null = null;
    private layout: BoardLayout = { gemSize: 64, offset: { x: 0, y: 0 } };
    private backdrop: Phaser.GameObjects.Graphics | null = null;
    private seed: number | null = null;
    /** Explode phases so far in this move: 1 for the move's own matches, then each cascade. */
    private chain = 0;

    constructor() {
        super(ClueBoardScene.KEY);
    }

    /** The gem icons (public/assets/evidence/<color>.svg). */
    preload(): void {
        for (const type of GEM_TYPES) this.load.svg(gemTexture(type), `/assets/evidence/${type}.svg`, { width: 128, height: 128 });
        this.load.on('loaderror', (file: Phaser.Loader.File) => console.error(`[ClueBoardScene] Failed to load ${file.url}`));
    }

    create(): void {
        makeToyTextures(this, GEM_TYPES);
        this.layout = squareBoardLayout(this.scale.width, this.scale.height, GRID_COLS, GRID_ROWS);
        this.backdrop = this.add.graphics().setDepth(-1);
        this.drawBackdrop();
        this.view = new BoardView(this, GRID_COLS, GRID_ROWS, this.layout);
        this.controller = new BoardController(this, this.model, this.view, this.layout, {
            onPhase: (phase, cascade) => this.reportMatches(phase, cascade),
            onMoveResolved: () => this.reshuffleIfStuck(),
            announce: (text, cell) => {
                const gem = cell ? this.model.getGrid()[cell[0]]?.[cell[1]] : undefined;
                const kind = gem ? kindOf(gem) : null;
                EventBus.emit('clue-board-announce', kind ? `${text}: ${kind === 'notes' ? 'note gem' : `${SHORT_LABEL[kind]} gem`}` : text);
            },
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('clue-board-setup', this.setupBoard, this);
        EventBus.on('clue-board-lock', this.setLock, this);
        EventBus.on('clue-board-key', this.onKey, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        EventBus.emit('current-scene-ready', this);
        attachDebugScene(this);
    }

    private setupBoard({ seed, allowedGemTypes, rare }: EventPayloads['clue-board-setup']): void {
        if (!this.view || !this.controller) return;
        this.seed = seed;
        this.model.newBoard(seed, allowedGemTypes, rare ?? null);
        this.view.setRareGem(rare?.type ?? null);
        this.controller.resetInput();
        this.view.createBoard(this.model.getGrid(), this.model.getToys());
        this.controller.ready = true;
    }

    private setLock({ locked }: EventPayloads['clue-board-lock']): void {
        if (this.controller) this.controller.locked = locked;
    }

    private onKey({ key, shift }: EventPayloads['clue-board-key']): void {
        void this.controller?.key(key, shift);
    }

    private reportMatches(phase: ExplodePhase, cascade: boolean): void {
        this.chain = cascade ? this.chain + 1 : 1;
        for (const group of phase.groups) {
            if (group.blast) continue; // a toy's clear flashes on its own (BoardView.animateFires)
            const kind = kindOf(group.gemType);
            // A note gem group is the notes collected this phase, not a match of its own.
            this.burst(group.cells, kind ? KIND_COLOR[kind] : '#ffffff', kind === 'notes' ? 0 : group.cells.length);
        }
        const big = phase.groups.some(group => !group.blast && group.cells.length >= 4);
        if (phase.fired.length > 0) {
            sfx.blast();
            this.cameras.main.shake(180, 0.008);
        } else if (big) {
            this.cameras.main.shake(120, 0.004);
        }
        sfx.pop(this.chain);
        if (phase.made.length > 0) sfx.toy();
        // What a toy's clear pays (the same rule as applyMatches): every `perBlast` gems, of the color cleared most.
        const blasts = phase.groups.filter(group => group.blast);
        const pooled = Math.floor(blasts.reduce((sum, group) => sum + group.cells.length, 0) / DEFAULT_RULES.perBlast);
        if (pooled > 0 && phase.fired.length > 0) {
            const most = blasts.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
            const kind = kindOf(most.gemType);
            this.label(phase.fired[0].cell, `+${pooled} charge${pooled === 1 ? '' : 's'}`, kind ? KIND_COLOR[kind] : '#ffffff');
        }
        if (this.chain >= 2) this.callout(`Chain ×${this.chain}!`);
        EventBus.emit('gems-matched', {
            groups: phase.groups.map(group => ({ gemType: group.gemType, size: group.cells.length, ...(group.blast ? { blast: true } : {}) })),
            cascade,
        });
    }

    /** Big text across the middle of the board that floats up and fades. */
    private callout(text: string): void {
        const { gemSize, offset } = this.layout;
        const label = this.add.text(offset.x + (GRID_COLS * gemSize) / 2, offset.y + (GRID_ROWS * gemSize) / 2, text, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: `${Math.round(gemSize * 0.45)}px`,
            color: '#fde68a',
            stroke: '#06121a',
            strokeThickness: Math.max(4, Math.round(gemSize * 0.1)),
        }).setOrigin(0.5).setDepth(70).setScale(0.5);
        this.tweens.add({ targets: label, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({ targets: label, y: label.y - gemSize * 0.8, alpha: 0, delay: 380, duration: 520, ease: 'Cubic.easeIn', onComplete: () => label.destroy() });
    }

    /** A colored ring where a group cleared; bigger matches ring wider and call out their charges. `size` 0: collected notes. */
    private burst(cells: Array<[number, number]>, color: string, size: number): void {
        const { gemSize, offset } = this.layout;
        const cx = offset.x + (cells.reduce((sum, [x]) => sum + x, 0) / cells.length + 0.5) * gemSize;
        const cy = offset.y + (cells.reduce((sum, [, y]) => sum + y, 0) / cells.length + 0.5) * gemSize;
        const ring = this.add.circle(cx, cy, gemSize * 0.4)
            .setStrokeStyle(Math.max(3, gemSize * 0.08), Phaser.Display.Color.HexStringToColor(color).color)
            .setDepth(50);
        this.tweens.add({
            targets: ring,
            scale: 1.6 + 0.3 * Math.max(0, size - 3),
            alpha: 0,
            duration: 420,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });

        // Only the bigger matches call their charges out (Rules.perMatch: 3, 4, 5 or more).
        const charges = size >= 5 ? DEFAULT_RULES.perMatch[2] : size === 4 ? DEFAULT_RULES.perMatch[1] : 0;
        const text = size === 0 ? '📓 saved' : `+${charges} charges`;
        if (size !== 0 && charges === 0) return;
        this.floatLabel(cx, cy, text, color);
    }

    /** A floating label over a cell. */
    private label([x, y]: [number, number], text: string, color: string): void {
        const { gemSize, offset } = this.layout;
        this.floatLabel(offset.x + (x + 0.5) * gemSize, offset.y + (y + 0.5) * gemSize, text, color);
    }

    /** Text that pops in at a point, then floats up and fades. */
    private floatLabel(cx: number, cy: number, text: string, color: string): void {
        const { gemSize } = this.layout;
        const label = this.add.text(cx, cy, text, {
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
        this.view.createBoard(this.model.getGrid(), this.model.getToys());
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
            toys: this.model.getToys(),
            view: this.view?.textureKeys() ?? [],
        };
    }

    debugModel(): BoardModel {
        return this.model;
    }

    private shutdown(): void {
        detachDebugScene(this);
        EventBus.off('clue-board-setup', this.setupBoard, this);
        EventBus.off('clue-board-lock', this.setLock, this);
        EventBus.off('clue-board-key', this.onKey, this);
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.view?.destroyBoard();
        this.view = null;
        this.controller = null;
        this.backdrop = null;
    }
}
