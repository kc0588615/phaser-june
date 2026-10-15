// BoardView: the board's sprites and every animation (swaps, swap-backs, toys going
// off, clears, falling refills, resize tweens). It never decides the rules:
// BoardController asks BoardModel what happened, then tells this class what to
// animate. Plan 044: animals pinned on the board sit on it as tiles; gems fall past
// them. Plan 046: each tile is a paper card hung on a pin (one container at the pin,
// so it swings around it), tilted a little and a bit bigger than its cell, so it
// never reads as a gem. It carries its number from the evidence grid on its bottom
// strip. Picked in the grid, its paper pulses blue; ruled out, a red marker cross and
// a grey photo; a swap that would release it pops its pin and the card hangs loose;
// a swap that would scout it (plan 045) shows the question gems on a strip above it.
// A try at moving a card wiggles it on its pin; a released card flutters off.
import Phaser from 'phaser';
import {
    CARD_TILTS, gemTexture,
    TWEEN_DURATION_EXPLODE, TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_PER_UNIT,
    TWEEN_DURATION_FALL_MAX, TWEEN_DURATION_SWAP, TWEEN_DURATION_LAYOUT_UPDATE,
    type GemType,
} from './constants';
import { applySwap, type Cell, type ExplodePhase, type Fire, type Grid, type Move, type Special, type Toy, type Toys } from './BoardModel';
import type { BoardPin } from './EventBus';
import type { BoardLayout } from './squareLayout';
import { toyTexture } from './toyTextures';

type Sprite = Phaser.GameObjects.Sprite;

/** A pinned animal's card (plan 046): one container at the pin holding the paper, photo (or badge), number, marks and scouting strip. */
interface Tile {
    pin: BoardPin;
    card: Phaser.GameObjects.Container;
    /** The card's shadow, paper and photo window. */
    paper: Phaser.GameObjects.Graphics;
    /** The paper's blue while the animal is picked in the grid (its alpha pulses). */
    tint: Phaser.GameObjects.Graphics;
    face: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    /** A ruled-out photo's grey (WebGL only). */
    grey: Phaser.FX.ColorMatrix | null;
    /** The animal's number in the evidence grid, handwritten on the bottom strip (null: no number). */
    tag: Phaser.GameObjects.Text | null;
    cross: Phaser.GameObjects.Graphics;
    pinHead: Phaser.GameObjects.Graphics;
    /** The scouting preview: the question gems a swap would scout here, on a strip above the card. */
    scoutBack: Phaser.GameObjects.Graphics;
    scout: Phaser.GameObjects.Image[];
    /** The loose card's sway while a swap would release it, and the wiggle of a try at moving it. */
    sway: Phaser.Tweens.Tween | null;
    wiggle: Phaser.Tweens.Tween | null;
}

/** After a tap: the marked animals a swap from that gem would release, and each unmarked one's question gems it would scout. */
export interface TilePreview { release: number[]; scout: Array<[id: number, gems: GemType[]]> }

const cellKey = ([x, y]: readonly [number, number]) => `${x},${y}`;
/** The cards' handwriting (globals.css @font-face). */
const CARD_FONT = '"Patrick Hand", "Comic Sans MS", cursive';
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export class BoardView {
    /** Sprites mirroring the model's grid, [x][y]. */
    private sprites: (Sprite | null)[][] = [];
    private readonly group: Phaser.GameObjects.Group;
    /** Running tweens and the resolve of each one's promise. Phaser destroys a killed tween without calling
     *  onComplete, so `stopTweens` resolves it here; otherwise a move awaiting it would never finish. */
    private readonly running = new Map<Phaser.Tweens.Tween, () => void>();
    /** The rare gem (field notes) glows so it stands out; null when the board has none. */
    private rareGem: GemType | null = null;
    /** Keyboard cursor outline, drawn once the player uses the keyboard. */
    private cursor: Phaser.GameObjects.Graphics | null = null;
    private cursorCell: Cell | null = null;
    /** The 3×3 a picked blast gem would clear. */
    private reach: Phaser.GameObjects.Graphics | null = null;
    private reachCell: Cell | null = null;
    /** The idle hint: a swap outlined after the player has done nothing for a while, and its pulse. */
    private hint: Phaser.GameObjects.Graphics | null = null;
    private hintMove: Move | null = null;
    private hintPulse: Phaser.Tweens.Tween | null = null;
    /** Cells holding a pinned animal (no gem sprite there), and each animal's tile. */
    private pinned = new Set<string>();
    private tiles = new Map<number, Tile>();
    private marked = new Set<number>();
    private previewed = new Set<number>();
    private scouting = new Map<number, GemType[]>();
    /** The animal picked in the evidence grid, and its card's pulse. */
    private selected: number | null = null;
    private selectPulse: Phaser.Tweens.Tween | null = null;
    /** Gem color -> the texture drawn for it this round (plan 044 faces); default gem_<color>. */
    private faces = new Map<GemType, string>();

    constructor(private readonly scene: Phaser.Scene, private readonly cols: number, private readonly rows: number, private layout: BoardLayout) {
        this.group = scene.add.group();
    }

    setRareGem(gem: GemType | null): void {
        this.rareGem = gem;
    }


    setFaces(faces: ReadonlyMap<GemType, string>): void {
        this.faces = new Map(faces);
    }

    /** A sprite for every gem (with its toy, if any), replacing any board already drawn. Pinned cells get none. */
    createBoard(grid: Grid, toys?: Toys): void {
        this.destroyBoard();
        this.sprites = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        grid.forEach((column, x) => column.forEach((gem, y) => {
            if (!this.pinned.has(`${x},${y}`)) this.createSprite(x, y, gem, undefined, toys?.[x]?.[y] ?? null);
        }));
    }

    /** Cards for the pinned animals, replacing any drawn before. Call before createBoard. */
    createTiles(pins: readonly BoardPin[]): void {
        for (const id of [...this.tiles.keys()]) this.destroyTile(id);
        this.pinned = new Set(pins.map(pin => cellKey(pin.cell)));
        this.marked.clear();
        this.previewed.clear();
        this.scouting.clear();
        this.setSelected(null);
        for (const pin of pins) {
            const paper = this.scene.add.graphics();
            const tint = this.scene.add.graphics().setAlpha(0);
            const face = this.badge(pin);
            const tag = pin.tag === undefined ? null : this.scene.add.text(0, 0, String(pin.tag), { fontFamily: CARD_FONT, color: '#1b2a2f' }).setOrigin(0.5);
            const cross = this.scene.add.graphics();
            const pinHead = this.scene.add.graphics();
            const scoutBack = this.scene.add.graphics();
            const card = this.scene.add.container(0, 0, [paper, tint, face, ...(tag ? [tag] : []), cross, pinHead, scoutBack]).setDepth(5);
            const key = `tile_${pin.id}`;
            const tile: Tile = { pin, card, paper, tint, face, grey: null, tag, cross, pinHead, scoutBack, scout: [], sway: null, wiggle: null };
            this.tiles.set(pin.id, tile);
            if (this.scene.textures.exists(key)) this.usePhoto(tile, key);
            else if (pin.photo) {
                this.scene.load.once(`filecomplete-image-${key}`, () => { if (this.tiles.get(pin.id) === tile) this.usePhoto(tile, key); });
                this.scene.load.setCORS('anonymous'); // Commons photos: a canvas texture needs CORS
                this.scene.load.image(key, pin.photo);
                this.scene.load.start();
            }
            this.drawTile(tile);
        }
        // A number drawn before the handwriting loaded is in the fallback font: redraw it once it's in.
        void document.fonts?.load('20px "Patrick Hand"').then(() => { for (const tile of this.tiles.values()) tile.tag?.updateText(); }).catch(() => undefined);
    }

    /** The animal picked in the evidence grid: its card's paper pulses blue (steady with reduced motion). */
    setSelected(id: number | null): void {
        this.selected = id;
        this.drawSelection();
    }

    private drawSelection(): void {
        this.selectPulse?.remove();
        this.selectPulse = null;
        for (const tile of this.tiles.values()) tile.tint.setAlpha(0);
        const tile = this.selected === null ? undefined : this.tiles.get(this.selected);
        if (!tile) return;
        tile.tint.setAlpha(1);
        if (!reducedMotion()) this.selectPulse = this.scene.tweens.add({ targets: tile.tint, alpha: 0.15, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    /** Ruled-out animals' cards get a red marker cross and a grey photo. */
    setMarked(ids: readonly number[]): void {
        this.marked = new Set(ids);
        for (const tile of this.tiles.values()) this.drawTile(tile);
    }

    /** The preview: the marked cards a swap would release hang loose from a popped pin; the ones it would scout show the question gems. */
    showPreview({ release, scout }: TilePreview): void {
        this.previewed = new Set(release);
        this.scouting = new Map(scout);
        for (const tile of this.tiles.values()) {
            for (const icon of tile.scout) icon.destroy();
            tile.scout = (this.scouting.get(tile.pin.id) ?? []).map(gem => this.scene.add.image(0, 0, this.faces.get(gem) ?? gemTexture(gem)));
            tile.card.add(tile.scout);
            this.drawTile(tile);
        }
    }

    /** The animals the release preview outlines (dev bridge). */
    previewIds(): number[] {
        return [...this.previewed];
    }

    /** The scouting preview's animals and gems (dev bridge). */
    scoutPreview(): Array<[number, GemType[]]> {
        return [...this.scouting];
    }

    clearPreview(): void {
        if (this.previewed.size === 0 && this.scouting.size === 0) return;
        this.showPreview({ release: [], scout: [] });
    }

    /** Released animals' cards come loose: the pin pops out and the card flutters off. Their cells become ordinary cells. */
    releaseTiles(ids: readonly number[]): Promise<void> {
        const { gemSize } = this.layout;
        const leaving: Promise<void>[] = [];
        for (const id of ids) {
            const tile = this.tiles.get(id);
            if (!tile) continue;
            this.tiles.delete(id);
            this.pinned.delete(cellKey(tile.pin.cell));
            if (id === this.selected) this.setSelected(null);
            tile.sway?.remove();
            tile.wiggle?.remove();
            leaving.push(Promise.all([
                this.tween({ targets: tile.pinHead, y: `-=${gemSize * 0.5}`, alpha: 0, duration: 200, ease: 'Quad.easeIn' }),
                this.tween({ targets: tile.card, x: `+=${gemSize * 0.2}`, y: `+=${gemSize * 0.9}`, angle: '+=35', alpha: 0, delay: 100, duration: 450, ease: 'Quad.easeIn' }),
            ]).then(() => { tile.card.destroy(); }));
        }
        return Promise.all(leaving).then(() => undefined);
    }

    /** A try at moving a card (swiped, or a gem swapped into it): it wiggles on its pin. */
    wiggleTile([x, y]: Cell): void {
        const tile = [...this.tiles.values()].find(({ pin: { cell } }) => cell[0] === x && cell[1] === y);
        if (!tile || tile.sway || reducedMotion()) return;
        const tilt = this.tiltOf(tile);
        tile.wiggle?.remove();
        tile.wiggle = this.scene.tweens.addCounter({
            from: 0, to: 1, duration: 420,
            onUpdate: tween => { const t = tween.getValue() ?? 1; tile.card.setAngle(tilt + 7 * Math.sin(t * Math.PI * 3) * (1 - t)); },
            onComplete: () => { tile.card.setAngle(tilt); tile.wiggle = null; },
        });
    }

    /** A gem swapped into a card bumps it and comes back. */
    bumpGem([x, y]: Cell, [tx, ty]: Cell): void {
        const sprite = this.spriteAt(x, y);
        if (!sprite) return;
        const home = this.positionOf(x, y);
        const reach = this.layout.gemSize * 0.3;
        this.stopTweens(sprite);
        sprite.setPosition(home.x, home.y); // from home, even when it cuts a bump short
        void this.tween({ targets: sprite, x: home.x + (tx - x) * reach, y: home.y + (ty - y) * reach, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
    }

    /** The gems a big match turned into toys change look, with a small pop. */
    showToys(made: Toy[]): void {
        for (const { cell: [x, y], special, gemType } of made) {
            const sprite = this.spriteAt(x, y);
            const key = toyTexture(gemType, special);
            if (!sprite || !this.scene.textures.exists(key)) continue;
            sprite.setTexture(key);
            this.stopTweens(sprite);
            const scale = this.scaleFor(sprite);
            sprite.setScale(scale * 1.3);
            this.scene.tweens.add({ targets: sprite, scale, duration: 180, ease: 'Back.easeOut' });
        }
    }

    /**
     * A flash where each toy goes off: a beam along its line (both lines for a cross), a ring for a blast (a big one for
     * the 5×5 combo), sparks on every gem of a color, a sweep over the whole board when two color gems meet.
     */
    animateFires(fires: Fire[]): Promise<void> {
        const { gemSize } = this.layout;
        const beam = (x: number, y: number, across: boolean) => {
            const middle = across ? this.positionOf(Math.floor(this.cols / 2), y) : this.positionOf(x, Math.floor(this.rows / 2));
            const rect = this.scene.add.rectangle(
                middle.x, middle.y, across ? gemSize * this.cols : gemSize * 0.55, across ? gemSize * 0.55 : gemSize * this.rows, 0xffffff, 0.8,
            ).setDepth(45);
            this.scene.tweens.add({ targets: rect, [across ? 'scaleY' : 'scaleX']: 0, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: () => rect.destroy() });
        };
        const ring = (x: number, y: number, radius: number) => {
            const center = this.positionOf(x, y);
            const circle = this.scene.add.circle(center.x, center.y, gemSize * radius, 0xffffff, 0.3).setStrokeStyle(Math.max(3, gemSize * 0.08), 0xffffff).setDepth(45).setScale(0.3);
            this.scene.tweens.add({ targets: circle, scale: 1, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => circle.destroy() });
        };
        for (const { cell: [x, y], special, cells, combo } of fires) {
            if (combo === 'cross') { beam(x, y, true); beam(x, y, false); }
            else if (combo === 'square') ring(x, y, 2.5);
            else if (combo === 'board') ring(Math.floor(this.cols / 2), Math.floor(this.rows / 2), Math.max(this.cols, this.rows) * 0.75);
            else if (special === 'row' || special === 'column') beam(x, y, special === 'row');
            else if (special === 'bomb') ring(x, y, 1.5);
            else {
                for (const [cx, cy] of cells) {
                    const at = this.positionOf(cx, cy);
                    const spark = this.scene.add.star(at.x, at.y, 5, gemSize * 0.12, gemSize * 0.3, 0xffffff).setDepth(45);
                    this.scene.tweens.add({ targets: spark, angle: 90, scale: 0.2, alpha: 0, duration: 320, ease: 'Quad.easeIn', onComplete: () => spark.destroy() });
                }
            }
        }
        // A short beat before the gems pop, tracked like any tween so a new board ends it.
        return new Promise(resolve => {
            const beat = this.scene.tweens.addCounter({ from: 0, to: 1, duration: 120, onComplete: () => { this.running.delete(beat); resolve(); } });
            this.running.set(beat, resolve);
        });
    }

    destroyBoard(): void {
        for (const [tween, resolve] of this.running) { tween.destroy(); resolve(); }
        this.running.clear();
        this.group.clear(true, true);
        this.sprites = [];
    }

    /** The board scene is closing: drop the tiles too. */
    destroyAll(): void {
        this.destroyBoard();
        for (const id of [...this.tiles.keys()]) this.destroyTile(id);
        this.pinned.clear();
        this.selectPulse?.remove();
    }

    /** Tweens the sprites to a new gem size and offset after a resize. */
    setLayout(layout: BoardLayout): void {
        this.layout = layout;
        if (this.cursorCell) this.showCursor(...this.cursorCell);
        this.showReach(this.reachCell);
        this.showHint(this.hintMove);
        for (const tile of this.tiles.values()) this.drawTile(tile);
        this.drawSelection();
        this.forEachSprite((sprite, x, y) => {
            this.stopTweens(sprite);
            this.scene.tweens.add({
                targets: sprite, ...this.positionOf(x, y), scale: this.scaleFor(sprite),
                duration: TWEEN_DURATION_LAYOUT_UPDATE, ease: 'Sine.easeInOut',
            });
        });
    }

    /** Slides two neighboring gems into each other's cells, the way the model swapped them. */
    animateSwap(move: Move): Promise<void> {
        applySwap(this.sprites, move);
        return this.slideHome([move.from, move.to]);
    }

    /** Slides two gems into each other's cells and back (a swap that makes no match). */
    async animateSwapBack(move: Move): Promise<void> {
        await this.animateSwap(move);
        await this.animateSwap(move);
    }

    /** Pops and removes the sprites at these cells. */
    animateExplosions(cells: Cell[]): Promise<void> {
        const pops: Promise<void>[] = [];
        for (const [x, y] of cells) {
            const sprite = this.spriteAt(x, y);
            if (!sprite) continue; // already popping (a cell in two groups)
            this.sprites[x][y] = null;
            this.stopTweens(sprite);
            pops.push(this.tween({
                targets: sprite, alpha: 0, scale: this.scaleFor(sprite) * 1.25, duration: TWEEN_DURATION_EXPLODE, ease: 'Quad.easeOut',
            }).then(() => { this.group.remove(sprite, true, true); }));
        }
        return Promise.all(pops).then(() => undefined);
    }

    /** Survivors fall to the bottom of each column, past pinned tiles; new gems drop in from above into the top free cells. */
    animateFalls(refills: ExplodePhase['refills']): Promise<void> {
        const next: (Sprite | null)[][] = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        const slots = (x: number) => Array.from({ length: this.rows }, (_cell, y) => y).filter(y => !this.pinned.has(`${x},${y}`));
        for (let x = 0; x < this.cols; x++) {
            const free = slots(x);
            const survivors = (this.sprites[x] ?? []).filter((sprite): sprite is Sprite => sprite !== null && sprite.active);
            survivors.forEach((sprite, i) => { next[x][free[free.length - survivors.length + i]] = sprite; });
        }
        this.sprites = next;
        for (const [x, gems] of refills) {
            const free = slots(x);
            gems.forEach((gem, i) => {
                const startY = this.layout.offset.y - (gems.length - i) * this.layout.gemSize - this.layout.gemSize / 2;
                this.createSprite(x, free[i], gem, startY);
            });
        }

        const falls: Promise<void>[] = [];
        this.forEachSprite((sprite, x, y) => {
            const target = this.positionOf(x, y);
            if (Math.round(sprite.x) === target.x && Math.round(sprite.y) === target.y && sprite.alpha === 1) return;
            const duration = Phaser.Math.Clamp(
                TWEEN_DURATION_FALL_BASE + Math.abs(sprite.y - target.y) * TWEEN_DURATION_FALL_PER_UNIT,
                TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_MAX,
            );
            this.stopTweens(sprite);
            falls.push(this.tween({ targets: sprite, ...target, alpha: 1, scale: this.scaleFor(sprite), duration, ease: 'Quad.easeOut' }));
        });
        return Promise.all(falls).then(() => undefined);
    }

    /** The texture each cell's sprite shows (dev bridge: the view must match the model); 'tile' on a pinned cell. */
    textureKeys(): (string | null)[][] {
        return Array.from({ length: this.cols }, (_column, x) => Array.from({ length: this.rows }, (_cell, y) =>
            (this.pinned.has(`${x},${y}`) ? 'tile' : this.spriteAt(x, y)?.texture.key ?? null)));
    }

    /** Outlines the keyboard cursor's cell. */
    showCursor(x: number, y: number): void {
        this.cursorCell = [x, y];
        this.cursor ??= this.scene.add.graphics().setDepth(40);
        const { gemSize } = this.layout;
        const center = this.positionOf(x, y);
        const half = gemSize / 2 - 2;
        this.cursor.clear()
            .lineStyle(Math.max(3, gemSize * 0.07), 0xfde68a, 1)
            .strokeRoundedRect(center.x - half, center.y - half, half * 2, half * 2, gemSize * 0.18);
    }

    hideCursor(): void {
        this.cursorCell = null;
        this.cursor?.clear();
    }

    /** Outlines the square a blast gem at this cell would clear (clipped to the board); null hides it. */
    /** The idle hint: both cells of a swap outlined, pulsing (steady with reduced motion); null hides it. */
    showHint(move: Move | null): void {
        this.hintMove = move;
        this.hintPulse?.remove();
        this.hintPulse = null;
        this.hint?.clear();
        if (!move) return;
        this.hint ??= this.scene.add.graphics().setDepth(39);
        const { gemSize } = this.layout;
        const a = this.positionOf(Math.min(move.from[0], move.to[0]), Math.min(move.from[1], move.to[1]));
        const b = this.positionOf(Math.max(move.from[0], move.to[0]), Math.max(move.from[1], move.to[1]));
        const [left, top, w, h] = [a.x - gemSize / 2, a.y - gemSize / 2, b.x - a.x + gemSize, b.y - a.y + gemSize];
        this.hint.setAlpha(1)
            .fillStyle(0xfde68a, 0.16).fillRoundedRect(left, top, w, h, gemSize * 0.22)
            .lineStyle(Math.max(2, gemSize * 0.06), 0xfde68a, 1).strokeRoundedRect(left, top, w, h, gemSize * 0.22);
        if (!reducedMotion()) this.hintPulse = this.scene.tweens.add({ targets: this.hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    /** The swap the idle hint outlines (dev bridge). */
    hintShown(): Move | null {
        return this.hintMove;
    }

    showReach(cell: Cell | null): void {
        this.reachCell = cell;
        this.reach?.clear();
        if (!cell) return;
        this.reach ??= this.scene.add.graphics().setDepth(39);
        const { gemSize } = this.layout;
        const [x0, y0] = [Math.max(0, cell[0] - 1), Math.max(0, cell[1] - 1)];
        const [x1, y1] = [Math.min(this.cols - 1, cell[0] + 1), Math.min(this.rows - 1, cell[1] + 1)];
        const a = this.positionOf(x0, y0);
        const b = this.positionOf(x1, y1);
        const [left, top, w, h] = [a.x - gemSize / 2, a.y - gemSize / 2, b.x - a.x + gemSize, b.y - a.y + gemSize];
        this.reach
            .fillStyle(0xffffff, 0.14).fillRoundedRect(left, top, w, h, gemSize * 0.22)
            .lineStyle(Math.max(2, gemSize * 0.05), 0xffffff, 0.9).strokeRoundedRect(left, top, w, h, gemSize * 0.22);
    }

    /** Tweens the sprites at these cells onto their cells. */
    private slideHome(cells: Cell[]): Promise<void> {
        return Promise.all(cells.map(([x, y]) => {
            const sprite = this.spriteAt(x, y);
            if (!sprite) return undefined;
            this.stopTweens(sprite);
            return this.tween({ targets: sprite, ...this.positionOf(x, y), duration: TWEEN_DURATION_SWAP, ease: 'Quad.easeInOut' });
        })).then(() => undefined);
    }

    private spriteAt(x: number, y: number): Sprite | null {
        const sprite = this.sprites[x]?.[y];
        return sprite?.active ? sprite : null;
    }

    /** A gem sprite on its cell (a toy's look when it carries one), or (with startY) invisible above the board, ready to fall. */
    private createSprite(x: number, y: number, gem: GemType, startY?: number, toy: Special | null = null): void {
        const key = toy && this.scene.textures.exists(toyTexture(gem, toy)) ? toyTexture(gem, toy) : this.faces.get(gem) ?? gemTexture(gem);
        if (!this.scene.textures.exists(key)) {
            console.error(`[BoardView] Missing texture ${key}`);
            return;
        }
        const target = this.positionOf(x, y);
        const sprite = this.group.create(target.x, startY ?? target.y, key) as Sprite;
        sprite.setScale(this.scaleFor(sprite)).setAlpha(startY === undefined ? 1 : 0);
        // preFX is WebGL only; on a canvas renderer the note gem just doesn't glow.
        if (gem === this.rareGem) sprite.preFX?.addGlow(0xf3e8ff, 6, 0, false, 0.1, 12);
        this.sprites[x][y] = sprite;
    }

    /** The card at its cell for the current layout, marks and preview. Local coordinates put the pin at 0,0. */
    private drawTile(tile: Tile): void {
        const g = this.layout.gemSize;
        const [w, h, pad, photoH] = [g * 1.08, g * 1.06, g * 0.065, g * 0.69];
        const photoW = w - 2 * pad;
        const [left, top] = [-w / 2, -g * 0.035];
        const corner = g * 0.025;
        const { x, y } = this.positionOf(...tile.pin.cell);
        tile.card.setPosition(x, y - top - h / 2);
        tile.paper.clear()
            .fillStyle(0x000000, 0.18).fillRoundedRect(left + g * 0.01, top + g * 0.035, w + g * 0.02, h + g * 0.02, corner)
            .fillStyle(0x000000, 0.3).fillRoundedRect(left + g * 0.02, top + g * 0.045, w, h, corner)
            .fillStyle(0xf6f1e4, 1).fillRoundedRect(left, top, w, h, corner);
        tile.paper.fillStyle(0xe4ded0, 1).fillRect(left + pad, top + pad, photoW, photoH);
        tile.tint.clear().fillStyle(0xbfe0ee, 1).fillRoundedRect(left, top, w, h, corner);
        const photoY = top + pad + photoH / 2;
        const marked = this.marked.has(tile.pin.id);
        if (tile.face instanceof Phaser.GameObjects.Image) {
            const { width, height } = tile.face.frame;
            const ratio = photoW / photoH;
            const cropW = Math.min(width, height * ratio);
            const cropH = cropW / ratio;
            tile.face.setCrop((width - cropW) / 2, (height - cropH) / 2, cropW, cropH).setScale(photoW / cropW).setPosition(0, photoY);
            if (marked && !tile.grey && tile.face.preFX) {
                tile.grey = tile.face.preFX.addColorMatrix();
                tile.grey.grayscale(1).brightness(0.85, true);
            }
            else if (!marked && tile.grey) { tile.face.preFX?.clear(); tile.grey = null; }
        } else {
            tile.face.setPosition(0, photoY).setFontSize(Math.round(g * 0.42));
        }
        tile.tag?.setPosition(0, top + pad + photoH + (h - pad - photoH) / 2).setFontSize(Math.round(g * 0.26));
        const ink = Math.max(3, g * 0.09);
        const [x0, y0, x1, y1] = [left + w * 0.14, top + h * 0.12, left + w * 0.86, top + h * 0.84];
        tile.cross.clear().setVisible(marked).lineStyle(ink, 0xe0262b, 1).lineBetween(x0, y0, x1, y1).lineBetween(x1, y0, x0, y1)
            .fillStyle(0xe0262b, 1).fillCircle(x0, y0, ink / 2).fillCircle(x1, y1, ink / 2).fillCircle(x1, y0, ink / 2).fillCircle(x0, y1, ink / 2);
        // A swap would release it: the pin pops up, bigger, and the card hangs loose and sways.
        const loose = this.previewed.has(tile.pin.id);
        const r = g * (loose ? 0.12 : 0.1);
        const lift = loose ? -g * 0.1 : 0;
        tile.pinHead.clear()
            .fillStyle(0x000000, 0.4).fillCircle(g * (loose ? 0.035 : 0.015), lift + g * (loose ? 0.07 : 0.03), r)
            .fillStyle(0x6e0a0a, 1).fillCircle(0, lift, r)
            .fillStyle(0xd62828, 1).fillCircle(-r * 0.12, lift - r * 0.12, r * 0.86)
            .fillStyle(0xff9b9b, 1).fillCircle(-r * 0.35, lift - r * 0.4, r * 0.28);
        const angle = this.tiltOf(tile) + (loose ? 8 : 0);
        if (!loose) {
            tile.sway?.remove();
            tile.sway = null;
            if (!tile.wiggle) tile.card.setAngle(angle);
        } else if (!tile.sway) {
            tile.wiggle?.remove();
            tile.wiggle = null;
            tile.card.setAngle(angle);
            if (!reducedMotion()) tile.sway = this.scene.tweens.add({ targets: tile.card, angle: angle + 5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        tile.scoutBack.clear();
        if (tile.scout.length > 0) {
            const size = g * 0.34;
            const step = size * 1.05;
            const mid = top - size * 0.3; // over the card's top edge
            const width = step * tile.scout.length + size * 0.25;
            tile.scoutBack.fillStyle(0x06121a, 0.85).fillRoundedRect(-width / 2, mid - size * 0.62, width, size * 1.24, size * 0.5)
                .lineStyle(Math.max(1.5, g * 0.035), 0x7dd3fc, 1).strokeRoundedRect(-width / 2, mid - size * 0.62, width, size * 1.24, size * 0.5);
            tile.scout.forEach((icon, i) => icon.setPosition((i - (tile.scout.length - 1) / 2) * step, mid).setScale(icon.width ? size / icon.width : 1));
        }
    }

    private tiltOf(tile: Tile): number {
        return CARD_TILTS[(tile.pin.tag ?? tile.pin.id) % CARD_TILTS.length];
    }

    /** The fallback face: the animal's badge (an emoji or its initials) in the photo window. */
    private badge(pin: BoardPin): Phaser.GameObjects.Text {
        return this.scene.add.text(0, 0, pin.label, { fontFamily: 'Arial, sans-serif', color: '#06121a' }).setOrigin(0.5);
    }

    /** Swap the badge for the loaded photo, cropped to the card's window in drawTile. */
    private usePhoto(tile: Tile, key: string): void {
        const at = tile.card.getIndex(tile.face);
        tile.face.destroy();
        tile.face = this.scene.add.image(0, 0, key);
        tile.card.addAt(tile.face, at);
        tile.grey = null;
        this.drawTile(tile);
    }

    private destroyTile(id: number): void {
        const tile = this.tiles.get(id);
        if (!tile) return;
        this.tiles.delete(id);
        tile.sway?.remove();
        tile.wiggle?.remove();
        tile.card.destroy(); // and everything on it
    }

    private positionOf(x: number, y: number): { x: number; y: number } {
        const { gemSize, offset } = this.layout;
        return {
            x: Math.round(offset.x + x * gemSize + gemSize / 2),
            y: Math.round(offset.y + y * gemSize + gemSize / 2),
        };
    }

    private scaleFor(sprite: Sprite): number {
        return sprite.width ? this.layout.gemSize / sprite.width : 1;
    }

    private forEachSprite(callback: (sprite: Sprite, x: number, y: number) => void): void {
        this.sprites.forEach((column, x) => column.forEach((sprite, y) => { if (sprite?.active) callback(sprite, x, y); }));
    }

    private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
        return new Promise(resolve => {
            const tween = this.scene.tweens.add({ ...config, onComplete: () => { this.running.delete(tween); resolve(); } });
            this.running.set(tween, resolve);
        });
    }

    /** Kill a sprite's tweens, resolving their promises so whatever awaited them carries on. */
    private stopTweens(sprite: Sprite): void {
        for (const tween of this.scene.tweens.getTweensOf(sprite)) {
            const resolve = this.running.get(tween);
            this.running.delete(tween);
            tween.destroy();
            resolve?.();
        }
    }
}
