// BoardView: the board's sprites and every animation (drag previews, snap-back,
// clears, falling refills, resize tweens). It never decides the rules:
// BoardController asks BoardModel what happened, then tells this class what to
// animate.
import Phaser from 'phaser';
import {
    gemTexture,
    TWEEN_DURATION_EXPLODE, TWEEN_DURATION_FALL_BASE, TWEEN_DURATION_FALL_PER_UNIT,
    TWEEN_DURATION_FALL_MAX, TWEEN_DURATION_SNAP, TWEEN_DURATION_LAYOUT_UPDATE,
    type GemType,
} from './constants';
import { applyShift, type Cell, type ExplodePhase, type Grid, type Move, type MoveDirection } from './BoardModel';
import type { BoardLayout } from './squareLayout';

type Sprite = Phaser.GameObjects.Sprite;

export class BoardView {
    /** Sprites mirroring the model's grid, [x][y]. */
    private sprites: (Sprite | null)[][] = [];
    private readonly group: Phaser.GameObjects.Group;
    /** Keyboard cursor outline, drawn once the player uses the keyboard. */
    private cursor: Phaser.GameObjects.Graphics | null = null;
    private cursorCell: Cell | null = null;

    constructor(private readonly scene: Phaser.Scene, private readonly cols: number, private readonly rows: number, private layout: BoardLayout) {
        this.group = scene.add.group();
    }

    /** A sprite for every gem, replacing any board already drawn. */
    createBoard(grid: Grid): void {
        this.destroyBoard();
        this.sprites = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        grid.forEach((column, x) => column.forEach((gem, y) => this.createSprite(x, y, gem)));
    }

    destroyBoard(): void {
        this.forEachSprite(sprite => this.scene.tweens.killTweensOf(sprite));
        this.group.clear(true, true);
        this.sprites = [];
    }

    /** Tweens the sprites to a new gem size and offset after a resize. */
    setLayout(layout: BoardLayout): void {
        this.layout = layout;
        if (this.cursorCell) this.showCursor(...this.cursorCell);
        this.forEachSprite((sprite, x, y) => {
            this.scene.tweens.killTweensOf(sprite);
            this.scene.tweens.add({
                targets: sprite, ...this.positionOf(x, y), scale: this.scaleFor(sprite),
                duration: TWEEN_DURATION_LAYOUT_UPDATE, ease: 'Sine.easeInOut',
            });
        });
    }

    /** Drag preview: the row or column follows the pointer by `offset` pixels, wrapping around the board edge. */
    dragLine(direction: MoveDirection, index: number, offset: number): void {
        const { gemSize, offset: board } = this.layout;
        // Half a pixel past the outside cell's center, so an exact whole-cell offset lands inside the board.
        const min = (direction === 'row' ? board.x : board.y) - gemSize / 2 + 0.5;
        const max = min + (direction === 'row' ? this.cols : this.rows) * gemSize;
        const length = direction === 'row' ? this.cols : this.rows;
        for (let i = 0; i < length; i++) {
            const [x, y] = direction === 'row' ? [i, index] : [index, i];
            const sprite = this.spriteAt(x, y);
            if (!sprite) continue;
            this.scene.tweens.killTweensOf(sprite);
            const home = this.positionOf(x, y);
            if (direction === 'row') sprite.setPosition(Phaser.Math.Wrap(home.x + offset, min, max), home.y);
            else sprite.setPosition(home.x, Phaser.Math.Wrap(home.y + offset, min, max));
        }
    }

    /** Slides a dragged line back home (a drag that made no move). */
    snapBack(direction: MoveDirection, index: number, offset: number): Promise<void> {
        const proxy = { offset };
        return this.tween({
            targets: proxy, offset: 0, duration: TWEEN_DURATION_SNAP, ease: 'Quad.easeOut',
            onUpdate: () => this.dragLine(direction, index, proxy.offset),
        });
    }

    /** Shifts the sprites the way the model shifted the gems, each onto its new cell. */
    applyMove(move: Move): void {
        applyShift(this.sprites, move);
        this.resetPositions();
    }

    /** Pops and removes the sprites at these cells. */
    animateExplosions(cells: Cell[]): Promise<void> {
        const pops: Promise<void>[] = [];
        for (const [x, y] of cells) {
            const sprite = this.spriteAt(x, y);
            if (!sprite) continue; // already popping (a cell in two groups)
            this.sprites[x][y] = null;
            this.scene.tweens.killTweensOf(sprite);
            pops.push(this.tween({
                targets: sprite, alpha: 0, scale: this.scaleFor(sprite) * 1.25, duration: TWEEN_DURATION_EXPLODE, ease: 'Quad.easeOut',
            }).then(() => { this.group.remove(sprite, true, true); }));
        }
        return Promise.all(pops).then(() => undefined);
    }

    /** Survivors fall to the bottom of each column; new gems drop in from above. */
    animateFalls(refills: ExplodePhase['refills']): Promise<void> {
        const next: (Sprite | null)[][] = Array.from({ length: this.cols }, () => new Array(this.rows).fill(null));
        for (let x = 0; x < this.cols; x++) {
            const survivors = (this.sprites[x] ?? []).filter((sprite): sprite is Sprite => sprite !== null);
            survivors.forEach((sprite, i) => { next[x][this.rows - survivors.length + i] = sprite; });
        }
        this.sprites = next;
        for (const [x, gems] of refills) {
            gems.forEach((gem, i) => {
                const startY = this.layout.offset.y - (gems.length - i) * this.layout.gemSize - this.layout.gemSize / 2;
                this.createSprite(x, i, gem, startY);
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
            this.scene.tweens.killTweensOf(sprite);
            falls.push(this.tween({ targets: sprite, ...target, alpha: 1, scale: this.scaleFor(sprite), duration, ease: 'Quad.easeOut' }));
        });
        return Promise.all(falls).then(() => undefined);
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

    /** Puts every sprite on its cell, fully visible. */
    resetPositions(): void {
        this.forEachSprite((sprite, x, y) => {
            const home = this.positionOf(x, y);
            this.scene.tweens.killTweensOf(sprite);
            sprite.setPosition(home.x, home.y).setScale(this.scaleFor(sprite)).setAlpha(1);
        });
    }

    private spriteAt(x: number, y: number): Sprite | null {
        const sprite = this.sprites[x]?.[y];
        return sprite?.active ? sprite : null;
    }

    /** A gem sprite on its cell, or (with startY) invisible above the board, ready to fall. */
    private createSprite(x: number, y: number, gem: GemType, startY?: number): void {
        const key = gemTexture(gem);
        if (!this.scene.textures.exists(key)) {
            console.error(`[BoardView] Missing texture ${key}`);
            return;
        }
        const target = this.positionOf(x, y);
        const sprite = this.group.create(target.x, startY ?? target.y, key) as Sprite;
        sprite.setScale(this.scaleFor(sprite)).setAlpha(startY === undefined ? 1 : 0);
        this.sprites[x][y] = sprite;
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
        return new Promise(resolve => { this.scene.tweens.add({ ...config, onComplete: () => resolve() }); });
    }
}
