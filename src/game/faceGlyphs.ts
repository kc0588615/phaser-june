// Where each 043 gem icon's glyph sits on the 128 px icon, and the disc of the gem's
// color that covers it when a round draws its own picture there (plan 044 faces).
// Shared by the board (faceTextures.ts) and the HUD (FaceIcon), so both match.
import type { GemType } from './constants';

export const FACE_GLYPH: Partial<Record<GemType, { y: number; radius: number; color: string }>> = {
    orange: { y: 62, radius: 34, color: '#f88d43' },
    yellow: { y: 77, radius: 26, color: '#ffd84a' },
    green: { y: 60, radius: 33, color: '#46c97c' },
    blue: { y: 60, radius: 30, color: '#4c9ffa' },
    black: { y: 63, radius: 35, color: '#f56ea7' },
};

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
