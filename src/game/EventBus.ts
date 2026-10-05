// EventBus — the single bridge between React (the Clue Match page) and Phaser
// (the board). Neither side imports the other; they only emit and listen to
// the events typed in `EventPayloads`:
//
//   board -> page  'current-scene-ready'  the board scene started (send setup)
//   page  -> board 'clue-board-setup'     build a seeded board from these colors
//   page  -> board 'clue-board-lock'      stop or resume accepting moves
//   board -> page  'gems-matched'         groups cleared in one explode phase
//   board -> page  'clue-board-shuffled'  no moves were left, so it reshuffled
//   page  -> board 'clue-board-key'       a key pressed on the focused board
//   board -> page  'clue-board-announce'  what a keyboard action did, for screen readers
//   page  -> board 'clue-board-marks'     the pinned animals the player ruled out (plan 044)
//   board -> page  'clue-board-settled'   a move and its cascades finished
//   page  -> board 'clue-board-select'    the animal picked in the evidence grid (its tile pulses)
//   board -> page  'clue-board-tile'      the player tapped an animal's tile
import Phaser from 'phaser';
import type { GemType } from './constants';

/** An animal pinned on the board (plan 044): its cell, id, photo (null: show `label`), name, and its number in the evidence grid. */
export interface BoardPin { cell: [x: number, y: number]; id: number; photo: string | null; label: string; name: string; tag?: number }

export interface EventPayloads {
    'current-scene-ready': Phaser.Scene;
    /**
     * Every group cleared in one explode phase (the player's move or a cascade); `blast`: gems a toy cleared outside any
     * match. `touched`: pinned animals with a cleared gem next to them; `released`: the marked ones among them, unpinned.
     * `from`: where each color cleared, in page (client) pixels, for the gem that flies to the evidence grid (plan 044).
     */
    'gems-matched': {
        groups: Array<{ gemType: GemType; size: number; blast?: boolean }>; cascade: boolean; touched?: number[]; released?: number[];
        from?: Array<{ gemType: GemType; x: number; y: number }>;
    };
    /**
     * `rare`: a gem that never matches by itself and is collected by a match next to it (the note gem). `pins`: animals
     * pinned on the board; `faces`: a picture (emoji) drawn on each gem color this round (plan 044 graybox).
     */
    'clue-board-setup': { seed: number; allowedGemTypes: GemType[]; rare?: { type: GemType; chance: number }; pins?: BoardPin[]; faces?: Partial<Record<GemType, string>> };
    'clue-board-lock': { locked: boolean };
    'clue-board-shuffled': undefined;
    /** Arrows move the cursor; with Shift they swap its gem that way; Escape drops a tapped gem. */
    'clue-board-key': { key: BoardKey; shift: boolean };
    'clue-board-announce': string;
    'clue-board-marks': { marked: number[] };
    'clue-board-settled': undefined;
    'clue-board-select': { id: number | null };
    'clue-board-tile': { id: number };
}

export type BoardKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Escape';

class TypedEventBus extends Phaser.Events.EventEmitter {
    emit<K extends keyof EventPayloads>(event: K, ...args: [EventPayloads[K]]): boolean {
        return super.emit(event, ...args);
    }

    on<K extends keyof EventPayloads>(event: K, fn: (arg: EventPayloads[K]) => void, context?: unknown): this {
        return super.on(event, fn, context);
    }

    off<K extends keyof EventPayloads>(event: K, fn?: (arg: EventPayloads[K]) => void, context?: unknown): this {
        return super.off(event, fn, context);
    }
}

export const EventBus = new TypedEventBus();
