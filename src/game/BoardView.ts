// BoardView: the board's sprites and every animation (swaps, swap-backs, toys going
// off, clears, falling refills, resize tweens). It never decides the rules:
// BoardController asks BoardModel what happened, then tells this class what to
// animate. Plan 044: animals pinned on the board are photo tiles in a round frame;
// gems fall past them; a ruled-out tile wears a red ring, the release preview an
// amber one, and a released tile hops off.
import Phaser from 'phaser';
import {
    gemTexture,
    TWEEN_DURATION_EXPLODE, TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_PER_UNIT,
    TWEEN_DURATION_FALL_MAX, TWEEN_DURATION_SWAP, TWEEN_DURATION_LAYOUT_UPDATE,
    type GemType,
} from './constants';
import { applySwap, type Cell, type ExplodePhase, type Fire, type Grid, type Move, type Special, type Toy, type Toys } from './BoardModel';
import type { BoardPin } from './EventBus';
import type { BoardLayout } from './squareLayout';
import { toyTexture } from './toyTextures';

type Sprite = Phaser.GameObjects.Sprite;

/** A pinned animal's look: a cream disc, its photo (or a badge) masked round, and a ring for marks and the preview. */
interface Tile {
    pin: BoardPin;
    back: Phaser.GameObjects.Graphics;
    face: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    mask: Phaser.GameObjects.Graphics | null;
    ring: Phaser.GameObjects.Graphics;
    cross: Phaser.GameObjects.Text;
}

const cellKey = ([x, y]: readonly [number, number]) => `${x},${y}`;

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
    /** Cells holding a pinned animal (no gem sprite there), and each animal's tile. */
    private pinned = new Set<string>();
    private tiles = new Map<number, Tile>();
    private marked = new Set<number>();
    private previewed = new Set<number>();
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

    /** Photo tiles for the pinned animals, replacing any drawn before. Call before createBoard. */
    createTiles(pins: readonly BoardPin[]): void {
        for (const id of [...this.tiles.keys()]) this.destroyTile(id);
        this.pinned = new Set(pins.map(pin => cellKey(pin.cell)));
        this.marked.clear();
        this.previewed.clear();
        for (const pin of pins) {
            const back = this.scene.add.graphics().setDepth(5);
            const ring = this.scene.add.graphics().setDepth(7);
            const cross = this.scene.add.text(0, 0, '✕', { fontFamily: 'Arial Black, Arial, sans-serif', color: '#ffffff', stroke: '#b91c1c', strokeThickness: 6 })
                .setOrigin(0.5).setDepth(8).setVisible(false);
            const key = `tile_${pin.id}`;
            const tile: Tile = { pin, back, ring, cross, mask: null, face: this.badge(pin) };
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
    }

    /** Ruled-out animals wear a red ring and a cross. */
    setMarked(ids: readonly number[]): void {
        this.marked = new Set(ids);
        for (const tile of this.tiles.values()) this.drawTile(tile);
    }

    /** The release preview: the marked tiles a swap would release wear an amber ring. */
    showPreview(ids: readonly number[]): void {
        this.previewed = new Set(ids);
        for (const tile of this.tiles.values()) this.drawTile(tile);
    }

    /** The animals the release preview outlines (dev bridge). */
    previewIds(): number[] {
        return [...this.previewed];
    }

    clearPreview(): void {
        if (this.previewed.size === 0) return;
        this.showPreview([]);
    }

    /** Released animals hop off the board; their cells become ordinary cells. */
    releaseTiles(ids: readonly number[]): Promise<void> {
        const hops: Promise<void>[] = [];
        for (const id of ids) {
            const tile = this.tiles.get(id);
            if (!tile) continue;
            this.tiles.delete(id);
            this.pinned.delete(cellKey(tile.pin.cell));
            const parts = [tile.back, tile.face, tile.ring, tile.cross];
            tile.face.clearMask();
            tile.mask?.destroy();
            hops.push(this.tween({
                targets: parts, y: `-=${this.layout.gemSize * 0.9}`, alpha: 0, duration: 420, ease: 'Back.easeIn',
            }).then(() => { for (const part of parts) part.destroy(); }));
        }
        return Promise.all(hops).then(() => undefined);
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
    }

    /** Tweens the sprites to a new gem size and offset after a resize. */
    setLayout(layout: BoardLayout): void {
        this.layout = layout;
        if (this.cursorCell) this.showCursor(...this.cursorCell);
        for (const tile of this.tiles.values()) this.drawTile(tile);
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

    /** The tile's look at its cell for the current layout, marks and preview. */
    private drawTile(tile: Tile): void {
        const { gemSize } = this.layout;
        const { x, y } = this.positionOf(...tile.pin.cell);
        const radius = gemSize * 0.46;
        const inner = radius * 0.84;
        tile.back.clear().fillStyle(0xf5efe1, 1).fillCircle(x, y, radius);
        if (tile.face instanceof Phaser.GameObjects.Image) {
            const scale = Math.max((inner * 2) / tile.face.width, (inner * 2) / tile.face.height);
            tile.face.setPosition(x, y).setScale(scale);
            tile.mask?.clear().fillStyle(0xffffff).fillCircle(x, y, inner);
        } else {
            tile.face.setPosition(x, y).setFontSize(Math.round(gemSize * 0.42));
        }
        const marked = this.marked.has(tile.pin.id);
        tile.ring.clear().lineStyle(Math.max(3, gemSize * 0.07), marked ? 0xef4444 : 0xf5efe1, 1).strokeCircle(x, y, inner + gemSize * 0.03);
        if (this.previewed.has(tile.pin.id)) tile.ring.lineStyle(Math.max(3, gemSize * 0.08), 0xfde68a, 1).strokeCircle(x, y, radius + gemSize * 0.04);
        tile.cross.setPosition(x + radius * 0.62, y - radius * 0.62).setFontSize(Math.round(gemSize * 0.3)).setVisible(marked);
    }

    /** The fallback face: the animal's badge (an emoji or its initials) on the cream disc. */
    private badge(pin: BoardPin): Phaser.GameObjects.Text {
        return this.scene.add.text(0, 0, pin.label, { fontFamily: 'Arial, sans-serif', color: '#06121a' }).setOrigin(0.5).setDepth(6);
    }

    /** Swap the badge for the loaded photo, masked to a circle. */
    private usePhoto(tile: Tile, key: string): void {
        tile.face.destroy();
        tile.face = this.scene.add.image(0, 0, key).setDepth(6);
        tile.mask = this.scene.make.graphics({}, false);
        tile.face.setMask(tile.mask.createGeometryMask());
        this.drawTile(tile);
    }

    private destroyTile(id: number): void {
        const tile = this.tiles.get(id);
        if (!tile) return;
        this.tiles.delete(id);
        tile.face.clearMask();
        tile.mask?.destroy();
        for (const part of [tile.back, tile.face, tile.ring, tile.cross]) part.destroy();
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
