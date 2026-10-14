// How a round's picture (the clue's face, plan 044) sits on each gem's 128 px icon: on
// a cream sticker in the middle of the shape (lower on the triangle), so any picture
// reads on any gem color. Shared by the board (faceTextures.ts) and the HUD (FaceIcon,
// the flying gem), so all three match.
import type { GemType } from './constants';

/** The sticker's center and radius on each shape (the triangle fits a smaller one, lower down). */
export const FACE_SPOT: Partial<Record<GemType, { y: number; r: number }>> = {
    orange: { y: 62, r: 38 }, yellow: { y: 76, r: 35 }, green: { y: 60, r: 38 }, blue: { y: 60, r: 38 }, black: { y: 63, r: 38 },
};
const NO_SPOT = { y: 64, r: 38 };
export const faceSpot = (gem: GemType) => FACE_SPOT[gem] ?? NO_SPOT;

/** An emoji face's size on the 128 px icon. */
export const FACE_SIZE = 50;

export const STICKER = { fill: '#fffaf0', rim: '#0b1a24', rimAlpha: 0.35 };

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TEXT_FONT = 'system-ui,"Segoe UI",Roboto,Arial,sans-serif';
export const TEXT_COLOR = '#1d2a33';

/** Faces that are plain text (S, 1–2, ←, ◎, ☀☾), not emoji. */
const TEXT_FACE = /^[\x20-\x7e–←-↙◎☀☾︎]+$/;

/** A face's font, and its size relative to an emoji's: text is dark and bold, and longer text shrinks to fit the sticker. */
export function faceLook(face: string): { font: string; scale: number; text: boolean } {
    if (!TEXT_FACE.test(face)) return { font: EMOJI_FONT, scale: 1, text: false };
    const length = [...face.replace(/︎/g, '')].length;
    return { font: TEXT_FONT, scale: [1, 1, 0.8, 0.62, 0.5][Math.min(length, 4)], text: true };
}

/** The sticker and the face as page elements (FaceIcon, the flying gem): CSS for each, centered by the caller. */
export function faceCss(gem: GemType, face: string, fontSize: number, unit: 'em' | 'px') {
    const { y, r } = faceSpot(gem);
    const top = `${(y / 128) * 100}%`;
    const width = `${(r / 64) * 100}%`;
    const look = faceLook(face);
    return {
        sticker: { left: '50%', top, width, height: width, background: STICKER.fill, borderRadius: '9999px', boxShadow: `0 0 0 1px ${STICKER.rim}${Math.round(STICKER.rimAlpha * 255).toString(16)}` },
        face: { left: '50%', top, fontFamily: look.font, fontSize: `${fontSize * look.scale}${unit}`, fontWeight: look.text ? 700 : 400, color: TEXT_COLOR, lineHeight: '1' },
    };
}
