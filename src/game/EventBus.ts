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
import Phaser from 'phaser';
import type { GemType } from './constants';

export interface EventPayloads {
    'current-scene-ready': Phaser.Scene;
    /** Every group cleared in one explode phase (the player's move or a cascade); `blast`: gems a toy cleared outside any match. */
    'gems-matched': { groups: Array<{ gemType: GemType; size: number; blast?: boolean }>; cascade: boolean };
    /** `rare`: a gem that never matches by itself and is collected by a match next to it (the note gem). */
    'clue-board-setup': { seed: number; allowedGemTypes: GemType[]; rare?: { type: GemType; chance: number } };
    'clue-board-lock': { locked: boolean };
    'clue-board-shuffled': undefined;
    /** Arrows move the cursor; with Shift they swap its gem that way; Escape drops a tapped gem. */
    'clue-board-key': { key: BoardKey; shift: boolean };
    'clue-board-announce': string;
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
