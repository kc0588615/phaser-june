// ClueBoardScene: the Clue Match board. The canvas belongs to the board: a
// centered square, no in-canvas HUD; React owns everything else. The scene
// reports each explode phase's groups ('gems-matched') and obeys
// 'clue-board-setup' / 'clue-board-lock'. Plan 044: animals pinned on the board,
// faces on the gems, and 'clue-board-marks': a marked animal touched by a clear is
// released (the rules decide the same from the same marks). A tapped tile picks its
// animal ('clue-board-tile', or 'clue-board-tile-hold' for a long press); the animal picked in the grid pulses ('clue-board-select').
// Plan 046: a try at moving a card wiggles it and says so ('clue-board-nudge'); a Yes about the mystery is acted out ('clue-board-answer').
// Plan 045: 'clue-board-unscouted' says which answers each animal still hides, for the scouting preview.
import Phaser from 'phaser';
import { BoardController } from './BoardController';
import { BoardModel, neighborSwaps, type Cell, type ExplodePhase, type Move, type Special } from './BoardModel';
import { BoardView, type TilePreview } from './BoardView';
import { GEM_COLOR, GEM_TYPES, GRID_COLS, GRID_ROWS, gemTexture, type GemType } from './constants';
import { EventBus, type EventPayloads } from './EventBus';
import { sfx } from './sfx';
import { squareBoardLayout, type BoardLayout } from './squareLayout';
import { makeFaceTextures } from './faceTextures';
import { makeToyTextures } from './toyTextures';
import { playAnswerEffect } from './answerEffects';
import { attachDebugScene, detachDebugScene, type DebugBoardSnapshot } from './debugBridge';
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
    /** Plan 044: the pinned animals the player ruled out, and whether this board has animals at all. */
    private marked = new Set<number>();
    private animals = false;
    /** Plan 045: per animal, the question gems whose answer it still hides. */
    private unscouted = new Map<number, GemType[]>();
    /** What a screen reader calls each gem this round (its clue's question, the pebble, the witness gem). */
    private labels: Partial<Record<GemType, string>> = {};
    private names = new Map<number, string>();
    private rareGem: GemType | null = null;
    /** Any tap or key on the page (the grid, a field guide) counts as activity for the idle hint, not just the board's. */
    private readonly onPageInput = () => this.controller?.activity();

    constructor() {
        super(ClueBoardScene.KEY);
    }

    /** The gem icons (public/assets/evidence/<color>.svg). */
    preload(): void {
        for (const type of GEM_TYPES) this.load.svg(gemTexture(type), `/assets/evidence/${type}.svg`, { width: 128, height: 128 });
        this.load.setCORS('anonymous'); // animal photos come from Wikimedia Commons
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
            preview: cell => this.preview(cell),
            hint: () => this.hint(),
            tileTap: ([x, y]) => {
                const pin = this.model.pinnedCells().find(([[px, py]]) => px === x && py === y);
                if (pin) EventBus.emit('clue-board-tile', { id: pin[1] });
            },
            tileHold: ([x, y]) => {
                const pin = this.model.pinnedCells().find(([[px, py]]) => px === x && py === y);
                if (pin) EventBus.emit('clue-board-tile-hold', { id: pin[1] });
            },
            nudge: ([x, y]) => {
                const pin = this.model.pinnedCells().find(([[px, py]]) => px === x && py === y);
                if (pin) EventBus.emit('clue-board-nudge', { id: pin[1] });
            },
            onMoveResolved: () => {
                this.reshuffleIfStuck();
                EventBus.emit('clue-board-settled', { grid: this.model.getGrid(), toys: this.model.getToys() });
            },
            announce: (text, cell) => {
                const pin = cell && this.model.pinnedCells().find(([[px, py]]) => px === cell[0] && py === cell[1]);
                const gem = cell ? this.model.getGrid()[cell[0]]?.[cell[1]] : undefined;
                const label = pin ? this.names.get(pin[1]) : gem ? this.labels[gem] : undefined;
                EventBus.emit('clue-board-announce', label ? `${text}: ${label}` : text);
            },
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        EventBus.on('clue-board-setup', this.setupBoard, this);
        EventBus.on('clue-board-lock', this.setLock, this);
        EventBus.on('clue-board-key', this.onKey, this);
        EventBus.on('clue-board-marks', this.onMarks, this);
        EventBus.on('clue-board-select', this.onSelect, this);
        EventBus.on('clue-board-unscouted', this.onUnscouted, this);
        EventBus.on('clue-board-answer', this.onAnswer, this);
        window.addEventListener('pointerdown', this.onPageInput, true);
        window.addEventListener('keydown', this.onPageInput, true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        // game.destroy() (React unmount, HMR) fires DESTROY, not SHUTDOWN; the display list is already gone by
        // then, so only unsubscribe, or a stale scene answers the next 'clue-board-setup' and crashes.
        this.events.once(Phaser.Scenes.Events.DESTROY, this.unsubscribe, this);

        EventBus.emit('current-scene-ready', this);
        attachDebugScene(this);
    }

    private setupBoard({ seed, allowedGemTypes, rare, pins = [], faces = {}, labels = {}, board, escapes }: EventPayloads['clue-board-setup']): void {
        if (!this.view || !this.controller) return;
        this.seed = seed;
        const pinned = pins.map((pin): [Cell, number] => [pin.cell, pin.id]);
        this.model.newBoard(seed, allowedGemTypes, rare ?? null, pinned);
        if (board) {
            const toys = board.toys.flatMap((column, x) => column.flatMap((toy, y): Array<[Cell, Special]> => (toy ? [[[x, y], toy]] : [])));
            this.model.loadBoard(board.grid, toys, pinned);
        }
        this.view.destroyBoard();
        const faceKeys = makeFaceTextures(this, faces);
        if (faceKeys.size > 0) makeToyTextures(this, GEM_TYPES, gem => faceKeys.get(gem) ?? gemTexture(gem), true);
        this.view.setFaces(faceKeys);
        this.view.setRareGem(rare?.type ?? null);
        this.rareGem = rare?.type ?? null;
        this.labels = labels;
        this.names = new Map(pins.map(pin => [pin.id, pin.name]));
        this.marked.clear();
        this.unscouted.clear();
        this.animals = pins.length > 0;
        this.controller.resetInput();
        this.view.createTiles(pins, escapes ?? null);
        this.view.createBoard(this.model.getGrid(), this.model.getToys());
        this.controller.ready = true;
    }

    private onMarks({ marked }: EventPayloads['clue-board-marks']): void {
        this.marked = new Set(marked);
        this.view?.setMarked(marked);
        this.controller?.refreshPreview();
        this.controller?.activity();
    }

    private onSelect({ id }: EventPayloads['clue-board-select']): void {
        this.view?.setSelected(id);
    }

    private onUnscouted({ unscouted }: EventPayloads['clue-board-unscouted']): void {
        this.unscouted = new Map(unscouted);
        this.controller?.refreshPreview();
    }

    /** Plan 046: a Yes about the mystery, acted out on the board for a moment. */
    private onAnswer({ tag, yes }: EventPayloads['clue-board-answer']): void {
        if (yes) playAnswerEffect(this, this.layout, tag);
    }

    /**
     * What any swap from this gem would do to the animals (the preview after a tap): the marked ones it would release,
     * and for each unmarked one the question gems its clear would scout (only answers still hidden; never the answer).
     */
    private preview([x, y]: [number, number]): TilePreview {
        const release = new Set<number>();
        const scout = new Map<number, Set<GemType>>();
        for (const to of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Array<[number, number]>) {
            for (const [id, colors] of this.model.previewNearColors({ from: [x, y], to })) {
                if (this.marked.has(id)) { release.add(id); continue; }
                const hidden = colors.filter(gem => this.unscouted.get(id)?.includes(gem));
                if (hidden.length > 0) scout.set(id, new Set([...(scout.get(id) ?? []), ...hidden]));
            }
        }
        return { release: [...release], scout: [...scout].map(([id, gems]) => [id, [...gems]]) };
    }

    /**
     * The idle hint's swap: one that releases a marked animal, else one that scouts a hidden answer, else any. Judged
     * from the board and the player's own marks only, never who still fits.
     */
    private hint(): Move | null {
        let best: Move | null = null;
        let bestRank = -1;
        for (const move of neighborSwaps(this.model.width, this.model.height)) {
            if (!this.model.canSwap(move)) continue;
            const near = this.model.previewNearColors(move);
            const rank = near.some(([id]) => this.marked.has(id)) ? 2
                : near.some(([id, colors]) => colors.some(gem => this.unscouted.get(id)?.includes(gem))) ? 1 : 0;
            if (rank > bestRank) [best, bestRank] = [move, rank];
            if (rank === 2) break;
        }
        return best;
    }

    private setLock({ locked }: EventPayloads['clue-board-lock']): void {
        if (this.controller) this.controller.locked = locked;
        this.controller?.activity();
    }

    private onKey({ key, shift }: EventPayloads['clue-board-key']): void {
        void this.controller?.key(key, shift);
    }

    /** Reports a phase to the page; returns the marked animals it touched, which the controller releases. */
    private reportMatches(phase: ExplodePhase, cascade: boolean): number[] {
        this.chain = cascade ? this.chain + 1 : 1;
        for (const group of phase.groups) {
            if (group.blast) continue; // a toy's clear flashes on its own (BoardView.animateFires)
            // A rare gem group is the notes collected this phase, not a match of its own.
            const rare = group.gemType === this.rareGem;
            this.burst(group.cells, GEM_COLOR[group.gemType] ?? '#ffffff', rare ? 0 : group.cells.length);
        }
        const released = phase.touched.filter(id => this.marked.has(id));
        // Plan 046: a card whose answer this move's own clear scouts hops (the rules decide the same: own move, unmarked, still hidden).
        if (!cascade) {
            for (const [id, colors] of phase.nearColors) {
                if (!this.marked.has(id) && colors.some(gem => this.unscouted.get(id)?.includes(gem))) this.view?.peekTile(id);
            }
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
        if (!this.animals && pooled > 0 && phase.fired.length > 0) {
            const most = blasts.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
            this.label(phase.fired[0].cell, `+${pooled} charge${pooled === 1 ? '' : 's'}`, GEM_COLOR[most.gemType] ?? '#ffffff');
        }
        if (this.chain >= 2) this.callout(`Chain ×${this.chain}!`);
        EventBus.emit('gems-matched', {
            groups: phase.groups.map(group => ({ gemType: group.gemType, size: group.cells.length, ...(group.blast ? { blast: true } : {}) })),
            cascade,
            ...(this.animals ? { touched: phase.touched, released, nearColors: phase.nearColors, from: this.clearedAt(phase) } : {}),
        });
        return released;
    }

    /** Where each color cleared this phase (the middle of its cells), in page pixels: the grid's gems fly from there. */
    private clearedAt(phase: ExplodePhase): Array<{ gemType: GemType; x: number; y: number }> {
        const rect = this.game.canvas.getBoundingClientRect();
        const sx = rect.width / this.scale.width;
        const sy = rect.height / this.scale.height;
        const { gemSize, offset } = this.layout;
        const byColor = new Map<GemType, Array<[number, number]>>();
        for (const group of phase.groups) byColor.set(group.gemType, [...(byColor.get(group.gemType) ?? []), ...group.cells]);
        return [...byColor].map(([gemType, cells]) => ({
            gemType,
            x: rect.left + sx * (offset.x + (cells.reduce((sum, [x]) => sum + x, 0) / cells.length + 0.5) * gemSize),
            y: rect.top + sy * (offset.y + (cells.reduce((sum, [, y]) => sum + y, 0) / cells.length + 0.5) * gemSize),
        }));
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

        // Only the bigger matches call their charges out (Rules.perMatch: 3, 4, 5 or more); the animal board has no charges.
        const charges = size >= 5 ? DEFAULT_RULES.perMatch[2] : size === 4 ? DEFAULT_RULES.perMatch[1] : 0;
        if (size === 0) this.floatLabel(cx, cy, this.animals ? '📓 note!' : '📓 saved', color);
        else if (charges > 0 && !this.animals) this.floatLabel(cx, cy, `+${charges} charges`, color);
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
            pins: this.model.pinnedCells(),
            preview: this.view?.previewIds() ?? [],
            scout: this.view?.scoutPreview() ?? [],
            hint: this.view?.hintShown() ?? null,
        };
    }

    debugModel(): BoardModel {
        return this.model;
    }

    private unsubscribe(): void {
        detachDebugScene(this);
        EventBus.off('clue-board-setup', this.setupBoard, this);
        EventBus.off('clue-board-lock', this.setLock, this);
        EventBus.off('clue-board-key', this.onKey, this);
        EventBus.off('clue-board-marks', this.onMarks, this);
        EventBus.off('clue-board-select', this.onSelect, this);
        EventBus.off('clue-board-unscouted', this.onUnscouted, this);
        EventBus.off('clue-board-answer', this.onAnswer, this);
        window.removeEventListener('pointerdown', this.onPageInput, true);
        window.removeEventListener('keydown', this.onPageInput, true);
        this.scale?.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
        this.view = null;
        this.controller = null;
        this.backdrop = null;
    }

    private shutdown(): void {
        this.view?.destroyAll();
        this.unsubscribe();
    }
}
