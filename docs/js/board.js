// Board State Management for Voltorb Flip
// Ported from C++ include/voltorb/board.hpp and src/board.cpp

import {
    BOARD_SIZE,
    PanelValue,
    GameResult,
    isMultiplier,
    isKnown
} from './boardTypes.js';

export class Board {
    constructor(level = 1) {
        this.level_ = level;
        this.panels_ = [];
        this.rowHints_ = [];
        this.colHints_ = [];

        // Initialize 5x5 grid with Unknown values
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.panels_[i] = [];
            for (let j = 0; j < BOARD_SIZE; j++) {
                this.panels_[i][j] = PanelValue.Unknown;
            }
        }

        // Initialize hints
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.rowHints_[i] = { sum: 0, voltorbCount: 0 };
            this.colHints_[i] = { sum: 0, voltorbCount: 0 };
        }
    }

    // Deep clone
    clone() {
        const copy = new Board(this.level_);
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                copy.panels_[i][j] = this.panels_[i][j];
            }
            copy.rowHints_[i] = { ...this.rowHints_[i] };
            copy.colHints_[i] = { ...this.colHints_[i] };
        }
        return copy;
    }

    // Panel access
    get(row, col) {
        if (typeof row === 'object') {
            // Position object
            return this.panels_[row.row][row.col];
        }
        return this.panels_[row][col];
    }

    set(row, col, value) {
        if (typeof row === 'object') {
            // Position object
            this.panels_[row.row][row.col] = col; // col is actually the value
            return;
        }
        this.panels_[row][col] = value;
    }

    // Hints
    get rowHints() { return this.rowHints_; }
    get colHints() { return this.colHints_; }

    rowHint(row) { return this.rowHints_[row]; }
    colHint(col) { return this.colHints_[col]; }

    setRowHint(row, hint) { this.rowHints_[row] = { ...hint }; }
    setColHint(col, hint) { this.colHints_[col] = { ...hint }; }

    // Level
    get level() { return this.level_; }
    set level(l) { this.level_ = l; }

    // Board state queries
    isFullyRevealed() {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Unknown) {
                    return false;
                }
            }
        }
        return true;
    }

    hasVoltorbFlipped() {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Voltorb) {
                    return true;
                }
            }
        }
        return false;
    }

    checkGameResult() {
        // Check for loss (voltorb revealed)
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Voltorb) {
                    return GameResult.Lost;
                }
            }
        }

        // Check for win (all multipliers revealed)
        // Count revealed multipliers vs required
        const revealedMultipliers = this.countMultipliersRevealed();
        const requiredMultipliers = this.totalMultipliersRequired();

        if (revealedMultipliers >= requiredMultipliers) {
            return GameResult.Won;
        }

        return GameResult.InProgress;
    }

    // Count methods
    countUnknown() {
        let count = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Unknown) {
                    count++;
                }
            }
        }
        return count;
    }

    countKnown() {
        return BOARD_SIZE * BOARD_SIZE - this.countUnknown();
    }

    countMultipliersRevealed() {
        let count = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (isMultiplier(this.panels_[i][j])) {
                    count++;
                }
            }
        }
        return count;
    }

    totalMultipliersRequired() {
        // Sum of multipliers = totalSum - (5*5 - totalVoltorbs)
        // totalSum = sum of all row hints
        // Multipliers = totalSum - n1 (ones) = totalSum - (25 - n0 - n2 - n3)
        // Actually, we need to know n2 + n3 from hints
        // Better approach: totalSum - (non-voltorb count) gives us the number of
        // "extra" points from multipliers

        let totalSum = 0;
        let totalVoltorbs = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            totalSum += this.rowHints_[i].sum;
            totalVoltorbs += this.rowHints_[i].voltorbCount;
        }

        // If all panels were 1s: sum would be 25 - totalVoltorbs
        // Extra sum = 2s contribute +1 each, 3s contribute +2 each
        // So number of multipliers >= (totalSum - (25 - totalVoltorbs)) / 2
        // But we can't know exact count without knowing board type

        // Conservative: count how many 2s and 3s are needed based on total sum
        const nonVoltorbs = 25 - totalVoltorbs;
        const extraPoints = totalSum - nonVoltorbs;

        // At minimum, we need floor(extraPoints / 2) multipliers (if all are 3s)
        // At maximum, we need extraPoints multipliers (if all are 2s)
        // But we need the exact count from revealed panels
        // For win detection, check if remaining unknown panels could all be 1s or voltorbs

        // Actually, for proper win detection we check:
        // If revealed 2s and 3s account for all extra points, we've won
        let revealed2s = 0, revealed3s = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Two) revealed2s++;
                if (this.panels_[i][j] === PanelValue.Three) revealed3s++;
            }
        }

        const revealedExtra = revealed2s + 2 * revealed3s;
        if (revealedExtra >= extraPoints) {
            // All multipliers revealed (or more than needed, shouldn't happen)
            return revealed2s + revealed3s;
        }

        // Return a value larger than revealed count to indicate not yet won
        return revealed2s + revealed3s + (extraPoints - revealedExtra);
    }

    // Get all panels
    get panels() { return this.panels_; }

    // Create a copy with a panel revealed
    withPanelRevealed(pos, value) {
        const copy = this.clone();
        copy.set(pos.row, pos.col, value);
        return copy;
    }

    // Comparison
    equals(other) {
        if (this.level_ !== other.level_) return false;

        for (let i = 0; i < BOARD_SIZE; i++) {
            if (this.rowHints_[i].sum !== other.rowHints_[i].sum ||
                this.rowHints_[i].voltorbCount !== other.rowHints_[i].voltorbCount) {
                return false;
            }
            if (this.colHints_[i].sum !== other.colHints_[i].sum ||
                this.colHints_[i].voltorbCount !== other.colHints_[i].voltorbCount) {
                return false;
            }
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] !== other.panels_[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    // Hashing for memoization (integer-safe using 32-bit arithmetic)
    hash() {
        let h = 0;

        // Hash level
        h = (Math.imul(h, 31) + this.level_) | 0;

        // Hash hints
        for (let i = 0; i < BOARD_SIZE; i++) {
            h = (Math.imul(h, 31) + this.rowHints_[i].sum) | 0;
            h = (Math.imul(h, 31) + this.rowHints_[i].voltorbCount) | 0;
            h = (Math.imul(h, 31) + this.colHints_[i].sum) | 0;
            h = (Math.imul(h, 31) + this.colHints_[i].voltorbCount) | 0;
        }

        // Hash panels (only revealed ones matter for state)
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                h = (Math.imul(h, 31) + (this.panels_[i][j] + 2)) | 0;
            }
        }

        return h >>> 0; // Convert to unsigned 32-bit
    }

    // Collision-free compact key for memoization
    compactKey() {
        let key = String(this.level_);
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                // Panel values: -1 (unknown), 0 (voltorb), 1, 2, 3
                // Shift by +2 to get single digits 1-5, unknown becomes 1
                key += String(this.panels_[i][j] + 2);
            }
        }
        return key;
    }

    // Recalculate hints from fully revealed panel state
    recalculateHints() {
        for (let i = 0; i < BOARD_SIZE; i++) {
            let rowSum = 0, rowVoltorbs = 0;
            let colSum = 0, colVoltorbs = 0;

            for (let j = 0; j < BOARD_SIZE; j++) {
                // Row calculation
                const rowVal = this.panels_[i][j];
                if (rowVal === PanelValue.Voltorb) {
                    rowVoltorbs++;
                } else if (rowVal > 0) {
                    rowSum += rowVal;
                }

                // Column calculation
                const colVal = this.panels_[j][i];
                if (colVal === PanelValue.Voltorb) {
                    colVoltorbs++;
                } else if (colVal > 0) {
                    colSum += colVal;
                }
            }

            this.rowHints_[i] = { sum: rowSum, voltorbCount: rowVoltorbs };
            this.colHints_[i] = { sum: colSum, voltorbCount: colVoltorbs };
        }
    }

    // Cover all panels (set to Unknown while keeping hints)
    toCovered() {
        const copy = this.clone();
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                copy.panels_[i][j] = PanelValue.Unknown;
            }
        }
        return copy;
    }

    // Get unknown panel positions
    getUnknownPositions() {
        const positions = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.panels_[i][j] === PanelValue.Unknown) {
                    positions.push({ row: i, col: j });
                }
            }
        }
        return positions;
    }

    // Get total voltorbs and sum from hints
    getTotals() {
        let totalVoltorbs = 0;
        let totalSum = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            totalVoltorbs += this.rowHints_[i].voltorbCount;
            totalSum += this.rowHints_[i].sum;
        }
        return { totalVoltorbs, totalSum };
    }

    // Debug string representation
    toString(highlight = null) {
        let str = `Level ${this.level_}\n`;

        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                const v = this.panels_[i][j];
                const isHighlight = highlight && highlight.row === i && highlight.col === j;

                let char;
                if (v === PanelValue.Unknown) char = '?';
                else if (v === PanelValue.Voltorb) char = 'X';
                else char = v.toString();

                str += isHighlight ? `[${char}]` : ` ${char} `;
            }
            str += ` | ${this.rowHints_[i].sum}:${this.rowHints_[i].voltorbCount}\n`;
        }

        str += '---'.repeat(BOARD_SIZE) + '\n';
        for (let j = 0; j < BOARD_SIZE; j++) {
            str += `${this.colHints_[j].sum}:${this.colHints_[j].voltorbCount} `;
        }

        return str;
    }
}

// Position helper
export function posToIndex(pos) {
    return pos.row * BOARD_SIZE + pos.col;
}

export function indexToPos(idx) {
    return {
        row: Math.floor(idx / BOARD_SIZE),
        col: idx % BOARD_SIZE
    };
}
