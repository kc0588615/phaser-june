// Plan 044 graybox faces: each round, a clue gem's color shows its clue's picture
// (an emoji) on a sticker on the gem's own shape, so a match reads as the clue it
// fills. The gem icons are blank shapes; the drawn art comes later (plan 044, Part 4).
import Phaser from 'phaser';
import { gemTexture, type GemType } from './constants';
import { FACE_SIZE, STICKER, TEXT_COLOR, faceLook, faceSpot } from './faceGlyphs';

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
            const { y, r } = faceSpot(gem);
            const sticker = scene.make.graphics({}, false);
            sticker.fillStyle(Phaser.Display.Color.HexStringToColor(STICKER.fill).color, 1).fillCircle(64, y, r);
            sticker.lineStyle(3, Phaser.Display.Color.HexStringToColor(STICKER.rim).color, STICKER.rimAlpha).strokeCircle(64, y, r);
            texture.draw(sticker, 0, 0);
            sticker.destroy();
            const look = faceLook(face);
            const text = scene.make.text({
                text: face,
                style: { fontFamily: look.font, fontSize: `${Math.round(FACE_SIZE * look.scale)}px`, fontStyle: look.text ? 'bold' : 'normal', color: TEXT_COLOR },
            }, false);
            texture.draw(text, Math.round(64 - text.width / 2), Math.round(y - text.height / 2));
            text.destroy();
        }
    }
    return keys;
}
