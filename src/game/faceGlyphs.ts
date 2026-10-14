// Where a round's picture (the clue's face, plan 044) sits on each gem's 128 px icon:
// the middle of the shape, lower on the triangle. Shared by the board (faceTextures.ts)
// and the HUD (FaceIcon, the flying gem), so all three match.
import type { GemType } from './constants';

export const FACE_Y: Partial<Record<GemType, number>> = { orange: 62, yellow: 77, green: 60, blue: 60, black: 63 };

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
