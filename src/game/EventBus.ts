// EventBus — the single bridge between React (the Clue Match page) and Phaser
// (the board). Neither side imports the other; they only emit and listen to
// the events typed in `EventPayloads`:
//
//   board -> page  'current-scene-ready'  the board scene started (send setup)
//   page  -> board 'clue-board-setup'     build a seeded board from these colors
//   page  -> board 'clue-board-lock'      stop or resume accepting moves
//   board -> page  'gems-matched'         groups cleared in one explode phase
//   board -> page  'clue-board-shuffled'  no moves were left, so it reshuffled
import Phaser from 'phaser';
import type { GemType } from './constants';

export interface EventPayloads {
    'current-scene-ready': Phaser.Scene;
    /** Every match group cleared in one explode phase (the player's move or a cascade). */
    'gems-matched': { groups: Array<{ gemType: GemType; size: number }>; cascade: boolean };
    'clue-board-setup': { seed: number; allowedGemTypes: GemType[] };
    'clue-board-lock': { locked: boolean };
    'clue-board-shuffled': undefined;
}

class TypedEventBus extends Phaser.Events.EventEmitter {
    emit<K extends keyof EventPayloads>(event: K, ...args: [EventPayloads[K]]): boolean {
        return super.emit(event, ...args);
    }

    on<K extends keyof EventPayloads>(event: K, fn: (arg: EventPayloads[K]) => void, context?: unknown): this {
        return super.on(event, fn, context);
    }

    once<K extends keyof EventPayloads>(event: K, fn: (arg: EventPayloads[K]) => void, context?: unknown): this {
        return super.once(event, fn, context);
    }

    off<K extends keyof EventPayloads>(event: K, fn?: (arg: EventPayloads[K]) => void, context?: unknown): this {
        return super.off(event, fn, context);
    }
}

export const EventBus = new TypedEventBus();
