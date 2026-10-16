// Plan 044 graybox faces: each round, a clue gem's color shows its clue's picture
// (an emoji) on the gem's own shape, so a match reads as the clue it fills. The gem icons are blank shapes; the drawn art comes later (plan 044, Part 4).
import Phaser from 'phaser';
import { gemTexture, type GemType } from './constants';
import { EMOJI_FONT, FACE_Y } from './faceGlyphs';

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
        if (face) {
            const text = scene.make.text({ text: face, style: { fontFamily: EMOJI_FONT, fontSize: '56px' } }, false);
            texture.draw(text, Math.round(64 - text.width / 2), Math.round((FACE_Y[gem] ?? 64) - text.height / 2)).render();
            text.destroy();
        } else texture.render();
    }
    return keys;
}
