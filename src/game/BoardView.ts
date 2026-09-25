// BoardView — the visual half of the board (the view).
//
// It turns BackendPuzzle's grid into Phaser sprites and runs every animation:
// drag previews, snap-back, clears, falling refills, and resize tweens. It never
// decides the rules: BoardController asks BackendPuzzle what happened, then tells
// this class what to animate.
import Phaser from 'phaser';
import {
    gemTexture,
    TWEEN_DURATION_EXPLODE, TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_PER_UNIT,
    TWEEN_DURATION_FALL_MAX, TWEEN_DURATION_SNAP, TWEEN_DURATION_LAYOUT_UPDATE,
    type GemType,
} from './constants';
import type { MoveAction, MoveDirection } from './MoveAction';
import type { Coordinate } from './ExplodeAndReplacePhase';
import type { PuzzleGrid } from './boardTypes';

interface BoardConfig {
    cols: number;
    rows: number;
    gemSize: number;
    boardOffset: { x: number; y: number };
}

type Sprite = Phaser.GameObjects.Sprite;
type StartPosition = { x: number; y: number; gridX: number; gridY: number };

export class BoardView {
    private readonly scene: Phaser.Scene;
    private readonly cols: number;
    private readonly rows: number;
    private gemSize: number;
    private boardOffset: { x: number; y: number };
    /** Sprites mirroring the logical grid, [x][y]. */
    private sprites: (Sprite | null)[][] = [];
    private readonly group: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene, config: BoardConfig) {
        this.scene = scene;
        this.cols = config.cols;
        this.rows = config.rows;
        this.gemSize = config.gemSize;
        this.boardOffset = config.boardOffset;
        this.group = scene.add.group();
    }

    /** Creates a sprite for every gem in the grid. */
    createBoard(grid: PuzzleGrid): void {
        this.destroyBoard();
        this.sprites = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        grid.forEach((column, x) => column.forEach((cell, y) => {
            if (cell) this.createSprite(x, y, cell.gemType);
        }));
    }

    /** Tweens sprites to a new size and offset after a resize. */
    updateVisualLayout(gemSize: number, boardOffset: { x: number; y: number }): void {
        this.gemSize = gemSize;
        this.boardOffset = boardOffset;
        this.forEachSprite((sprite, x, y) => {
            const target = this.positionOf(x, y);
            this.scene.tweens.killTweensOf(sprite);
            this.scene.tweens.add({
                targets: sprite, x: target.x, y: target.y, scale: this.scaleFor(sprite),
                duration: TWEEN_DURATION_LAYOUT_UPDATE, ease: 'Sine.easeInOut',
            });
        });
    }

    /** Moves a dragged row or column with the pointer, wrapping around the board edge. */
    moveDraggingSprites(sprites: Sprite[], starts: StartPosition[], deltaX: number, deltaY: number, direction: MoveDirection): void {
        const [min, max] = this.wrapRange(direction);
        sprites.forEach((sprite, i) => {
            const start = starts[i];
            if (!sprite?.active || !start) return;
            if (direction === 'row') sprite.x = Phaser.Math.Wrap(start.x + deltaX, min, max);
            else sprite.y = Phaser.Math.Wrap(start.y + deltaY, min, max);
        });
    }

    /** Puts every sprite exactly on its cell (after the sprite grid was updated for a move). */
    snapDraggedGemsToFinalGridPositions(): void {
        this.forEachSprite((sprite, x, y) => {
            const target = this.positionOf(x, y);
            this.scene.tweens.killTweensOf(sprite);
            sprite.setPosition(target.x, target.y).setScale(this.scaleFor(sprite));
            sprite.setData('gridX', x).setData('gridY', y);
        });
    }

    /** Slides a dragged row or column back to where it started (a drag that made no match). */
    snapBack(sprites: Sprite[], starts: StartPosition[], direction: MoveDirection | undefined, totalDeltaX: number, totalDeltaY: number): Promise<void> {
        if (!sprites.length || sprites.length !== starts.length) return Promise.resolve();
        sprites.forEach(sprite => { if (sprite?.active) this.scene.tweens.killTweensOf(sprite); });
        const finish = () => sprites.forEach((sprite, i) => {
            if (!sprite?.active) return;
            sprite.setPosition(starts[i].x, starts[i].y).setData('gridX', starts[i].gridX).setData('gridY', starts[i].gridY);
        });

        if (!direction) {
            return Promise.all(sprites.map((sprite, i) => sprite?.active
                ? this.tween({ targets: sprite, x: starts[i].x, y: starts[i].y, duration: TWEEN_DURATION_SNAP, ease: 'Quad.easeOut' })
                : Promise.resolve())).then(finish);
        }

        const [min, max] = this.wrapRange(direction);
        const proxy = { value: 1 }; // 1 = the full drag offset, 0 = back at the start
        return this.tween({
            targets: proxy, value: 0, duration: TWEEN_DURATION_SNAP, ease: 'Quad.easeOut',
            onUpdate: () => sprites.forEach((sprite, i) => {
                if (!sprite?.active) return;
                if (direction === 'row') sprite.setPosition(Phaser.Math.Wrap(starts[i].x + totalDeltaX * proxy.value, min, max), starts[i].y);
                else sprite.setPosition(starts[i].x, Phaser.Math.Wrap(starts[i].y + totalDeltaY * proxy.value, min, max));
            }),
        }).then(finish);
    }

    /** Pops and removes the sprites at the matched cells. */
    animateExplosions(coords: Coordinate[]): Promise<void> {
        const cleared = new Set<string>();
        const pops: Promise<void>[] = [];
        for (const [x, y] of coords) {
            const sprite = this.getSpriteAt(x, y);
            if (!sprite || cleared.has(`${x},${y}`)) continue;
            cleared.add(`${x},${y}`);
            this.sprites[x][y] = null;
            this.scene.tweens.killTweensOf(sprite);
            pops.push(this.tween({
                targets: sprite, alpha: 0, scale: this.scaleFor(sprite) * 1.25, duration: TWEEN_DURATION_EXPLODE, ease: 'Quad.easeOut',
            }).then(() => this.destroySprite(sprite)));
        }
        return Promise.all(pops).then(() => undefined);
    }

    /** Survivors fall to the bottom of each column; new gems drop in from above. */
    animateFalls(replacements: Array<[number, GemType[]]>, _finalGrid: PuzzleGrid): Promise<void> {
        const next: (Sprite | null)[][] = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        const moving: Array<{ sprite: Sprite; x: number; y: number }> = [];

        for (let x = 0; x < this.cols; x++) {
            let slot = this.rows - 1;
            for (let y = this.rows - 1; y >= 0; y--) {
                const sprite = this.getSpriteAt(x, y);
                if (!sprite) continue;
                next[x][slot] = sprite;
                moving.push({ sprite, x, y: slot });
                slot--;
            }
        }
        for (const [x, types] of replacements) {
            types.forEach((type, i) => {
                const y = next[x].findIndex(sprite => sprite === null);
                if (y < 0) return;
                const startY = this.boardOffset.y - (i + 1) * this.gemSize - this.gemSize / 2;
                const sprite = this.createSprite(x, y, type, startY, next);
                if (sprite) moving.push({ sprite, x, y });
            });
        }
        this.sprites = next;

        return Promise.all(moving.map(({ sprite, x, y }) => {
            sprite.setData('gridX', x).setData('gridY', y);
            const target = this.positionOf(x, y);
            if (Math.round(sprite.x) === target.x && Math.round(sprite.y) === target.y && sprite.alpha === 1) return Promise.resolve();
            const duration = Phaser.Math.Clamp(
                TWEEN_DURATION_FALL_BASE + Math.abs(sprite.y - target.y) * TWEEN_DURATION_FALL_PER_UNIT,
                TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_MAX,
            );
            this.scene.tweens.killTweensOf(sprite);
            return this.tween({ targets: sprite, x: target.x, y: target.y, alpha: 1, scale: this.scaleFor(sprite), duration, ease: 'Quad.easeOut' });
        })).then(() => undefined);
    }

    /** Shifts the sprite grid the same way BackendPuzzle shifted the gems. */
    updateGemsSpritesArrayAfterMove({ rowOrCol, index, amount }: MoveAction): void {
        if (rowOrCol === 'row') {
            const shift = ((amount % this.cols) + this.cols) % this.cols;
            if (shift === 0 || index < 0 || index >= this.rows) return;
            const row = this.sprites.map(column => column[index] ?? null);
            const shifted = [...row.slice(-shift), ...row.slice(0, this.cols - shift)];
            shifted.forEach((sprite, x) => { this.sprites[x][index] = sprite; sprite?.setData('gridX', x).setData('gridY', index); });
        } else {
            const shift = ((amount % this.rows) + this.rows) % this.rows;
            const column = this.sprites[index];
            if (shift === 0 || !column) return;
            this.sprites[index] = [...column.slice(this.rows - shift), ...column.slice(0, this.rows - shift)];
            this.sprites[index].forEach((sprite, y) => sprite?.setData('gridX', index).setData('gridY', y));
        }
    }

    destroyBoard(): void {
        this.forEachSprite(sprite => this.scene.tweens.killTweensOf(sprite));
        this.group.clear(true, true);
        this.sprites = [];
    }

    /** Puts any sprite that drifted back on its cell, fully visible. */
    syncSpritesToGridPositions(): void {
        this.forEachSprite((sprite, x, y) => {
            const target = this.positionOf(x, y);
            this.scene.tweens.killTweensOf(sprite);
            sprite.setPosition(target.x, target.y).setScale(this.scaleFor(sprite)).setAlpha(1);
        });
    }

    getGemsSprites(): (Sprite | null)[][] {
        return this.sprites;
    }

    private getSpriteAt(x: number, y: number): Sprite | null {
        const sprite = this.sprites[x]?.[y];
        return sprite?.active ? sprite : null;
    }

    private createSprite(x: number, y: number, type: GemType, startY?: number, into = this.sprites): Sprite | null {
        const key = gemTexture(type);
        if (!this.scene.textures.exists(key)) {
            console.error(`[BoardView] Missing texture ${key}`);
            return null;
        }
        const target = this.positionOf(x, y);
        const sprite = this.group.create(target.x, startY ?? target.y, key) as Sprite;
        sprite.setOrigin(0.5).setData('gridX', x).setData('gridY', y).setData('gemType', type);
        sprite.setScale(this.scaleFor(sprite)).setInteractive();
        if (startY !== undefined) sprite.setAlpha(0);
        into[x][y] = sprite;
        return sprite;
    }

    private destroySprite(sprite: Sprite): void {
        if (!sprite.active) return;
        this.scene.tweens.killTweensOf(sprite);
        this.group.remove(sprite, true, true);
    }

    private positionOf(x: number, y: number): { x: number; y: number } {
        return {
            x: Math.round(this.boardOffset.x + x * this.gemSize + this.gemSize / 2),
            y: Math.round(this.boardOffset.y + y * this.gemSize + this.gemSize / 2),
        };
    }

    private scaleFor(sprite: Sprite): number {
        return sprite.width ? this.gemSize / sprite.width : 1;
    }

    /** The visual span a dragged row (x) or column (y) wraps within. */
    private wrapRange(direction: MoveDirection): [number, number] {
        const min = (direction === 'row' ? this.boardOffset.x : this.boardOffset.y) - this.gemSize / 2;
        return [min, min + (direction === 'row' ? this.cols : this.rows) * this.gemSize];
    }

    private forEachSprite(callback: (sprite: Sprite, x: number, y: number) => void): void {
        this.sprites.forEach((column, x) => column?.forEach((sprite, y) => { if (sprite?.active) callback(sprite, x, y); }));
    }

    private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
        return new Promise(resolve => { this.scene.tweens.add({ ...config, onComplete: () => resolve() }); });
    }
}
