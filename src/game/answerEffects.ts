// Plan 046 step 4: when the mystery's answer to a question lands as Yes, the board
// acts it out for a moment with emoji: ants march across it ("eats mostly bugs"),
// dusk falls ("active at night"), the sun comes up ("active in the day"), eggs drop
// in ("lays eggs"), ripples spread ("lives in water"), leaves drift down ("eats
// only plants"). Only the mystery's own earned answer, so it shows what the grid
// already says and never points at a suspect. Cosmetic only: nothing here reads or
// changes the board, and input passes through. With reduced motion, the emoji just
// shows in the middle of the board and fades.
import Phaser from 'phaser';
import { EMOJI_FONT } from './faceGlyphs';
import type { BoardLayout } from './squareLayout';
import { GRID_COLS, GRID_ROWS } from './constants';

/** The board's box in scene pixels. */
interface Box { left: number; top: number; width: number; height: number; g: number }

type Effect = (scene: Phaser.Scene, box: Box) => void;

const DEPTH = 55; // over gems, cards and bursts; under callouts

const emoji = (scene: Phaser.Scene, x: number, y: number, text: string, size: number) =>
    scene.add.text(x, y, text, { fontFamily: EMOJI_FONT, fontSize: `${Math.round(size)}px` })
        .setOrigin(0.5).setDepth(DEPTH).setShadow(1, 2, 'rgba(0, 0, 0, 0.65)', 4, false, true); // lifts it off same-colored gems

/** A tint over the whole board that fades in, holds, and fades out. */
function wash(scene: Phaser.Scene, { left, top, width, height }: Box, color: number, alpha: number): void {
    const rect = scene.add.rectangle(left + width / 2, top + height / 2, width, height, color).setAlpha(0).setDepth(DEPTH - 1);
    scene.tweens.add({ targets: rect, alpha, duration: 400, hold: 900, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => rect.destroy() });
}

const ants: Effect = (scene, { left, top, width, g }) => {
    const y = top + g * (2 + Math.floor(Math.random() * 3)); // along a grid line in the middle rows
    for (let i = 0; i < 4; i++) {
        const ant = emoji(scene, left + width + g * (0.6 + i * 0.55), y, '🐜', g * 0.38); // the emoji faces left, so they march left
        scene.tweens.add({ targets: ant, y: y - g * 0.05, duration: 120, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: ant, x: left - g * (0.6 + (3 - i) * 0.55), duration: 2000, ease: 'Linear', onComplete: () => { scene.tweens.killTweensOf(ant); ant.destroy(); } });
    }
};

const night: Effect = (scene, box) => {
    const { left, top, width, height, g } = box;
    wash(scene, box, 0x0b1030, 0.5);
    const moon = emoji(scene, left + width * 0.8, top + g * 1.2, '🌙', g * 0.8).setAlpha(0);
    scene.tweens.add({ targets: moon, alpha: 1, y: top + g * 0.8, duration: 500, hold: 800, yoyo: true, onComplete: () => moon.destroy() });
    for (let i = 0; i < 5; i++) {
        const star = emoji(scene, left + Math.random() * width, top + Math.random() * height * 0.7, '✨', g * 0.3).setAlpha(0);
        scene.tweens.add({ targets: star, alpha: 1, delay: 200 + i * 150, duration: 300, yoyo: true, hold: 400, onComplete: () => star.destroy() });
    }
};

const day: Effect = (scene, box) => {
    const { left, top, width, height, g } = box;
    wash(scene, box, 0xffd84a, 0.22);
    const sun = emoji(scene, left + width * 0.2, top + height, '☀️', g * 0.9).setAlpha(0);
    scene.tweens.add({ targets: sun, alpha: { from: 0, to: 1 }, x: left + width / 2, y: top + g, duration: 900, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: sun, alpha: 0, delay: 1300, duration: 400, onComplete: () => sun.destroy() });
};

const eggs: Effect = (scene, { left, top, g }) => {
    const columns = Phaser.Utils.Array.Shuffle([...Array(GRID_COLS).keys()]).slice(0, 5);
    columns.forEach((column, i) => {
        const egg = emoji(scene, left + (column + 0.5) * g, top - g, '🥚', g * 0.62);
        const floor = top + (2 + Math.random() * (GRID_ROWS - 3)) * g;
        scene.tweens.add({ targets: egg, y: floor, delay: i * 120, duration: 700, ease: 'Bounce.easeOut' });
        scene.tweens.add({ targets: egg, alpha: 0, delay: 1300 + i * 120, duration: 300, onComplete: () => egg.destroy() });
    });
};

const water: Effect = (scene, { left, top, width, height, g }) => {
    const [cx, cy] = [left + width / 2, top + height / 2];
    for (let i = 0; i < 3; i++) {
        const ring = scene.add.circle(cx, cy, width * 0.5).setStrokeStyle(Math.max(3, g * 0.08), 0x7dd3fc).setDepth(DEPTH).setScale(0.1);
        scene.tweens.add({ targets: ring, scale: 1.1, alpha: { from: 0.9, to: 0 }, delay: i * 300, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    const drop = emoji(scene, cx, cy - g * 1.5, '💧', g * 0.7);
    scene.tweens.add({ targets: drop, y: cy, alpha: { from: 1, to: 0 }, duration: 500, ease: 'Quad.easeIn', onComplete: () => drop.destroy() });
};

const leaves: Effect = (scene, { left, top, width, height, g }) => {
    for (let i = 0; i < 6; i++) {
        const x = left + (i + 0.5) * (width / 6);
        const leaf = emoji(scene, x, top - g * 0.5, '🍃', g * 0.6);
        scene.tweens.add({ targets: leaf, x: x + g * 0.4, duration: 450, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
        scene.tweens.add({
            targets: leaf, y: top + height * (0.6 + Math.random() * 0.3), angle: 120, alpha: { from: 1, to: 0 },
            delay: i * 100, duration: 1800, ease: 'Sine.easeIn', onComplete: () => { scene.tweens.killTweensOf(leaf); leaf.destroy(); },
        });
    }
};

const EFFECTS: Record<string, [effect: Effect, emoji: string]> = {
    'diet:insects': [ants, '🐜'],
    'activity:night': [night, '🌙'],
    'activity:day': [day, '☀️'],
    'birth:eggs': [eggs, '🥚'],
    'system:freshwater': [water, '💧'],
    'system:marine': [water, '🌊'],
    'habitat:wetlands': [water, '💧'],
    'diet:plants': [leaves, '🍃'],
};

/** Act out a Yes to this question on the board, if it has an effect. */
export function playAnswerEffect(scene: Phaser.Scene, layout: BoardLayout, tag: string): void {
    const entry = EFFECTS[tag];
    if (!entry) return;
    const { gemSize: g, offset } = layout;
    const box: Box = { left: offset.x, top: offset.y, width: GRID_COLS * g, height: GRID_ROWS * g, g };
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!still) {
        entry[0](scene, box);
        return;
    }
    const icon = emoji(scene, box.left + box.width / 2, box.top + box.height / 2, entry[1], g * 1.2);
    scene.tweens.add({ targets: icon, alpha: 0, delay: 900, duration: 400, onComplete: () => icon.destroy() });
}
