// A clue gem as the board draws it this round (plan 044 graybox): the 043 gem shape
// with its glyph covered and the clue's picture on top (src/game/faceTextures.ts).
import { EMOJI_FONT, FACE_GLYPH } from '@/game/faceGlyphs';
import type { GemType } from '@/game/constants';
import { GemIcon } from '@/components/clueGame/GemIcon';

export function FaceIcon({ gem, face, className = 'h-7 w-7' }: { gem: GemType; face: string; className?: string }) {
  const glyph = FACE_GLYPH[gem];
  const top = `${((glyph?.y ?? 64) / 128) * 100}%`;
  return (
    <span className={`relative inline-block shrink-0 ${className}`} aria-hidden="true">
      <GemIcon gem={gem} className="h-full w-full" />
      {glyph && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: '50%', top, width: `${(glyph.radius / 64) * 100}%`, height: `${(glyph.radius / 64) * 100}%`, background: glyph.color }}
        />
      )}
      {face && (
        <span className="absolute -translate-x-1/2 -translate-y-1/2 leading-none" style={{ left: '50%', top, fontFamily: EMOJI_FONT, fontSize: '0.95em' }}>{face}</span>
      )}
    </span>
  );
}
