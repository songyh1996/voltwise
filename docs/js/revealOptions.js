import { PanelValue } from "./boardTypes.js";
import { generateCompatibleBoards } from "./solver.js";

const REVEAL_VALUES = [
    PanelValue.Voltorb,
    PanelValue.One,
    PanelValue.Two,
    PanelValue.Three
];

/**
 * Return only values that leave at least one complete, level-legal board.
 *
 * Each candidate is searched independently with a one-board limit. Finding
 * one board proves the value is possible; exhausting the generator proves it
 * is impossible. The caller's board is restored before returning.
 */
export function findAllowedRevealValues(board, row, col) {
    const previousValue = board.get(row, col);
    const allowed = [];

    try {
        for (const value of REVEAL_VALUES) {
            board.set(row, col, value);
            if (generateCompatibleBoards(board, 1).length > 0) {
                allowed.push(value);
            }
        }
    } finally {
        board.set(row, col, previousValue);
    }

    return allowed;
}
