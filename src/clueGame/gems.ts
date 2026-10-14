// Which gem icon stood for which Question Match kind (plan 041), for old 043 log entries.
// The live game (plan 044) gives gems to clue slots, not kinds: see CLUE_GEMS in animalBoard.ts.
import type { GemType } from '@/game/constants';
import type { GemKind } from '@/clueGame/questionMatch';

export const GEM_OF: Record<GemKind, GemType> = { body: 'orange', habits: 'yellow', habitat: 'green', range: 'blue', life: 'black', notes: 'purple' };
