// Plan 044 graybox faces: each round, a clue gem's color shows its clue's picture
// (an emoji) on the gem's own shape, so a match reads as the clue it fills. Drawn
// over the 043 gem icon: its glyph is covered by a disc of the gem's color first.
// The drawn art comes later (plan 044, Part 4).
import Phaser from 'phaser';
import { gemTexture, type GemType } from './constants';
import { EMOJI_FONT, FACE_GLYPH } from './faceGlyphs';

export const faceTexture = (gem: GemType, face: string): string => `face_${gem}_${[...face].map(c => c.codePointAt(0)!.toString(16)).join('-') || 'plain'}`;

/** Textures for this round's faces (an empty face: the shape alone); returns gem color -> texture key. */
export function makeFaceTextures(scene: Phaser.Scene, faces: Partial<Record<GemType, string>>): Map<GemType, string> {
    const keys = new Map<GemType, string>();
    for (const [gem, face] of Object.entries(faces) as Array<[GemType, string]>) {
        const key = faceTexture(gem, face);
        keys.set(gem, key);
        if (scene.textures.exists(key) || !scene.textures.exists(gemTexture(gem))) continue;
        const texture = scene.textures.addDynamicTexture(key, 128, 128);
        if (!texture) continue;
        texture.stamp(gemTexture(gem), undefined, 64, 64);
        const glyph = FACE_GLYPH[gem];
        if (glyph) {
            const cover = scene.make.graphics({}, false);
            cover.fillStyle(Phaser.Display.Color.HexStringToColor(glyph.color).color, 1).fillCircle(64, glyph.y, glyph.radius);
            texture.draw(cover, 0, 0);
            cover.destroy();
        }
        if (face) {
            const text = scene.make.text({ text: face, style: { fontFamily: EMOJI_FONT, fontSize: '56px' } }, false);
            texture.draw(text, Math.round(64 - text.width / 2), Math.round((glyph?.y ?? 64) - text.height / 2));
            text.destroy();
        }
    }
    return keys;
}
