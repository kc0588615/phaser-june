// src/game/ExplodeAndReplacePhase.ts

import { GemType } from './constants';

export type Coordinate = [number, number]; // [x, y]
export type Match = Coordinate[]; // Array of coordinates that form a match
export type ColumnReplacement = [number, GemType[]]; // [columnIndex, array of gem types to spawn]

/**
 * Represents the result of applying moves: matches found and replacements needed.
 */
export class ExplodeAndReplacePhase {
    /**
     * Creates an ExplodeAndReplacePhase result.
     * @param matches - The coordinates of matched gems.
     * @param replacements - The new gems needed per column.
     */
    constructor(
        public readonly matches: Match[] = [],
        public readonly replacements: ColumnReplacement[] = []
    ) {}

    /**
     * Checks if any matches occurred in this phase.
     * @returns True if there were no matches.
     */
    isNothingToDo(): boolean {
        return this.matches.length === 0;
    }

    /**
     * Gets all unique coordinates from all matches
     */
    getAllMatchedCoordinates(): Set<string> {
        const coords = new Set<string>();
        this.matches.forEach(match => {
            match.forEach(([x, y]) => {
                coords.add(`${x},${y}`);
            });
        });
        return coords;
    }

    /**
     * Gets the total number of gems that will be replaced
     */
    getTotalReplacements(): number {
        return this.replacements.reduce((sum, [, gems]) => sum + gems.length, 0);
    }

    /**
     * Gets replacement gems for a specific column
     */
    getReplacementsForColumn(columnIndex: number): GemType[] {
        const replacement = this.replacements.find(([col]) => col === columnIndex);
        return replacement ? replacement[1] : [];
    }
}
