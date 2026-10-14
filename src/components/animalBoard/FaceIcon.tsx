// A clue gem as the board draws it this round (plan 044 graybox): the gem shape with
// the clue's picture on a sticker (src/game/faceTextures.ts).
import { faceCss } from '@/game/faceGlyphs';
import type { GemType } from '@/game/constants';
import { GemIcon } from '@/components/clueGame/GemIcon';

export function FaceIcon({ gem, face, className = 'h-7 w-7' }: { gem: GemType; face: string; className?: string }) {
  const css = faceCss(gem, face, 0.8, 'em');
  return (
    <span className={`relative inline-block shrink-0 ${className}`} aria-hidden="true">
      <GemIcon gem={gem} className="h-full w-full" />
      {face && (
        <>
          <span className="absolute -translate-x-1/2 -translate-y-1/2" style={css.sticker} />
          <span className="absolute -translate-x-1/2 -translate-y-1/2" style={css.face}>{face}</span>
        </>
      )}
    </span>
  );
}
