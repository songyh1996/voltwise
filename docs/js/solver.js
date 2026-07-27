// Solver Logic for Voltorb Flip
// Implements iterative deepening with memoization for optimal play

import {
    BOARD_SIZE,
    NUM_TYPES_PER_LEVEL,
    PanelValue,
    getParams,
    getAcceptedCount,
    getN1,
    getTotalSum,
    isMultiplier,
    isKnown,
    isCompatibleWithType
} from './boardTypes.js';

import { Board } from './board.js';

// Check if a board configuration is legal according to type constraints
export function isLegal(board, params) {
    const rowHints = board.rowHints;
    const colHints = board.colHints;

    // Count multipliers in "free" rows/columns (those with 0 voltorbs)
    let totalFreeMultipliers = 0;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const v = board.get(i, j);
            if (isMultiplier(v)) {
                if (rowHints[i].voltorbCount === 0 || colHints[j].voltorbCount === 0) {
                    totalFreeMultipliers++;
                }
            }
        }
    }

    if (totalFreeMultipliers >= params.maxTotalFree) {
        return false;
    }

    // Check per-row constraints for free rows
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (rowHints[i].voltorbCount === 0) {
            let rowMultipliers = 0;
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (isMultiplier(board.get(i, j))) {
                    rowMultipliers++;
                }
            }
            if (rowMultipliers >= params.maxRowFree) {
                return false;
            }
        }
    }

    // Check per-column constraints for free columns
    for (let j = 0; j < BOARD_SIZE; j++) {
        if (colHints[j].voltorbCount === 0) {
            let colMultipliers = 0;
            for (let i = 0; i < BOARD_SIZE; i++) {
                if (isMultiplier(board.get(i, j))) {
                    colMultipliers++;
                }
            }
            if (colMultipliers >= params.maxRowFree) {
                return false;
            }
        }
    }

    return true;
}

// Check if revealed panels don't exceed hint constraints
export function panelsDontExceedConstraints(board) {
    const rowHints = board.rowHints;
    const colHints = board.colHints;

    // Check row constraints
    for (let i = 0; i < BOARD_SIZE; i++) {
        let sum = 0;
        let voltorbs = 0;
        let unknownCount = 0;

        for (let j = 0; j < BOARD_SIZE; j++) {
            const v = board.get(i, j);
            if (v === PanelValue.Unknown) {
                unknownCount++;
            } else if (v === PanelValue.Voltorb) {
                voltorbs++;
            } else {
                sum += v;
            }
        }

        if (sum > rowHints[i].sum) return false;
        if (voltorbs > rowHints[i].voltorbCount) return false;

        if (unknownCount === 0) {
            if (sum !== rowHints[i].sum) return false;
            if (voltorbs !== rowHints[i].voltorbCount) return false;
        } else {
            const remainingSum = rowHints[i].sum - sum;
            const remainingVoltorbs = rowHints[i].voltorbCount - voltorbs;
            const remainingNonVoltorbs = unknownCount - remainingVoltorbs;

            if (remainingNonVoltorbs < 0) return false;
            if (remainingSum < remainingNonVoltorbs) return false;
            if (remainingSum > remainingNonVoltorbs * 3) return false;
        }
    }

    // Check column constraints
    for (let j = 0; j < BOARD_SIZE; j++) {
        let sum = 0;
        let voltorbs = 0;
        let unknownCount = 0;

        for (let i = 0; i < BOARD_SIZE; i++) {
            const v = board.get(i, j);
            if (v === PanelValue.Unknown) {
                unknownCount++;
            } else if (v === PanelValue.Voltorb) {
                voltorbs++;
            } else {
                sum += v;
            }
        }

        if (sum > colHints[j].sum) return false;
        if (voltorbs > colHints[j].voltorbCount) return false;

        if (unknownCount === 0) {
            if (sum !== colHints[j].sum) return false;
            if (voltorbs !== colHints[j].voltorbCount) return false;
        } else {
            const remainingSum = colHints[j].sum - sum;
            const remainingVoltorbs = colHints[j].voltorbCount - voltorbs;
            const remainingNonVoltorbs = unknownCount - remainingVoltorbs;

            if (remainingNonVoltorbs < 0) return false;
            if (remainingSum < remainingNonVoltorbs) return false;
            if (remainingSum > remainingNonVoltorbs * 3) return false;
        }
    }

    return true;
}

// Generate all combinations of k items from n positions
function* combinations(positions, k) {
    if (k === 0) {
        yield [];
        return;
    }
    if (positions.length < k) return;

    for (let i = 0; i <= positions.length - k; i++) {
        for (const rest of combinations(positions.slice(i + 1), k - 1)) {
            yield [positions[i], ...rest];
        }
    }
}

// Generate all valid voltorb position configurations
function* generateVoltorbPositions(board) {
    const rowHints = board.rowHints;
    const colHints = board.colHints;

    function* generateRow(row, colCounts, current) {
        if (row === BOARD_SIZE) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (colCounts[j] !== colHints[j].voltorbCount) return;
            }

            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    const revealed = board.get(i, j);
                    if (isKnown(revealed)) {
                        const shouldBeVoltorb = current[i][j];
                        const isVoltorb = (revealed === PanelValue.Voltorb);
                        if (shouldBeVoltorb !== isVoltorb) return;
                    }
                }
            }

            yield current.map(row => [...row]);
            return;
        }

        const voltorbsNeeded = rowHints[row].voltorbCount;
        const rowPositions = [0, 1, 2, 3, 4];

        for (const combo of combinations(rowPositions, voltorbsNeeded)) {
            const newColCounts = [...colCounts];
            const newCurrent = current.map(r => [...r]);
            newCurrent[row] = [false, false, false, false, false];

            for (const j of combo) {
                newCurrent[row][j] = true;
                newColCounts[j]++;
            }

            let valid = true;
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (newColCounts[j] > colHints[j].voltorbCount) {
                    valid = false;
                    break;
                }
                const remainingRows = BOARD_SIZE - 1 - row;
                if (newColCounts[j] + remainingRows < colHints[j].voltorbCount) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                yield* generateRow(row + 1, newColCounts, newCurrent);
            }
        }
    }

    const initial = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        initial[i] = [false, false, false, false, false];
    }

    yield* generateRow(0, [0, 0, 0, 0, 0], initial);
}

// Fill non-voltorb positions with 1s, 2s, 3s according to type
function* fillNonVoltorbs(board, voltorbPositions, types, maxBoards = 500000) {
    const level = board.level;
    const params = getParams(level, types[0]);

    const template = new Board(level);
    for (let i = 0; i < BOARD_SIZE; i++) {
        template.setRowHint(i, board.rowHint(i));
        template.setColHint(i, board.colHint(i));
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (voltorbPositions[i][j]) {
                template.set(i, j, PanelValue.Voltorb);
            } else {
                template.set(i, j, PanelValue.Unknown);
            }
        }
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const revealed = board.get(i, j);
            if (isKnown(revealed) && revealed !== PanelValue.Voltorb) {
                template.set(i, j, revealed);
            }
        }
    }

    let placed2s = 0, placed3s = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const v = template.get(i, j);
            if (v === PanelValue.Two) placed2s++;
            if (v === PanelValue.Three) placed3s++;
        }
    }

    const remaining2s = params.n2 - placed2s;
    const remaining3s = params.n3 - placed3s;

    if (remaining2s < 0 || remaining3s < 0) return;

    const unknownPositions = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (template.get(i, j) === PanelValue.Unknown) {
                unknownPositions.push({ row: i, col: j });
            }
        }
    }

    let count = 0;

    function* fill(posIdx, board, rem2s, rem3s) {
        if (count >= maxBoards) return;

        if (posIdx >= unknownPositions.length) {
            const isLegalForAnyType = types.some(type => isLegal(board, getParams(level, type)));
            if (panelsDontExceedConstraints(board) && isLegalForAnyType) {
                count++;
                yield board.clone();
            }
            return;
        }

        const pos = unknownPositions[posIdx];
        const remainingPositions = unknownPositions.length - posIdx - 1;

        if (rem2s + rem3s > remainingPositions + 1) return;

        board.set(pos.row, pos.col, PanelValue.One);
        if (panelsDontExceedConstraints(board)) {
            yield* fill(posIdx + 1, board, rem2s, rem3s);
        }

        if (rem2s > 0) {
            board.set(pos.row, pos.col, PanelValue.Two);
            if (panelsDontExceedConstraints(board)) {
                yield* fill(posIdx + 1, board, rem2s - 1, rem3s);
            }
        }

        if (rem3s > 0) {
            board.set(pos.row, pos.col, PanelValue.Three);
            if (panelsDontExceedConstraints(board)) {
                yield* fill(posIdx + 1, board, rem2s, rem3s - 1);
            }
        }

        board.set(pos.row, pos.col, PanelValue.Unknown);
    }

    yield* fill(0, template, remaining2s, remaining3s);
}

// Generate compatible boards for a given board state
export function generateCompatibleBoards(board, maxBoards = 500000) {
    const level = board.level;
    const compatibleBoards = [];

    if (!panelsDontExceedConstraints(board)) {
        return compatibleBoards;
    }

    const { totalVoltorbs, totalSum } = board.getTotals();

    const compatibleTypes = [];
    for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
        if (isCompatibleWithType(totalVoltorbs, totalSum, level, type)) {
            compatibleTypes.push(type);
        }
    }

    if (compatibleTypes.length === 0) return compatibleBoards;

    const voltorbConfigs = [...generateVoltorbPositions(board)];

    // Several game types share the same panel composition but differ only in
    // their "free row/column" legality limits. Generate each physical board
    // once, then assign it to every type it is legal for in groupBoardsByType.
    // Generating once per type would duplicate boards in the stricter types and
    // skew the Bayesian posterior.
    const compositionGroups = new Map();
    for (const type of compatibleTypes) {
        const params = getParams(level, type);
        const key = `${params.n0}:${params.n2}:${params.n3}`;
        if (!compositionGroups.has(key)) compositionGroups.set(key, []);
        compositionGroups.get(key).push(type);
    }

    for (const types of compositionGroups.values()) {
        if (compatibleBoards.length >= maxBoards) break;

        for (const voltorbs of voltorbConfigs) {
            if (compatibleBoards.length >= maxBoards) break;

            for (const filled of fillNonVoltorbs(board, voltorbs, types, maxBoards - compatibleBoards.length)) {
                compatibleBoards.push(filled);
                if (compatibleBoards.length >= maxBoards) break;
            }
        }
    }

    return compatibleBoards;
}

// Group boards by type — assign each board to ALL matching types (with legality check)
export function groupBoardsByType(boards, level) {
    const groups = [];
    for (let i = 0; i < NUM_TYPES_PER_LEVEL; i++) {
        groups[i] = [];
    }

    for (const board of boards) {
        let count0 = 0, count2 = 0, count3 = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                const v = board.get(i, j);
                if (v === PanelValue.Voltorb) count0++;
                else if (v === PanelValue.Two) count2++;
                else if (v === PanelValue.Three) count3++;
            }
        }

        for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
            const params = getParams(level, type);
            if (params.n0 === count0 && params.n2 === count2 && params.n3 === count3) {
                if (isLegal(board, params)) {
                    groups[type].push(board);
                }
            }
        }
    }

    return groups;
}

// Calculate type probabilities using Bayesian inference
export function calculateTypeProbabilities(level, countsPerType) {
    const probs = new Array(NUM_TYPES_PER_LEVEL).fill(0);
    let pBoardSum = 0;

    for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
        const nAccepted = Number(getAcceptedCount(level, type));
        if (nAccepted > 0) {
            const pBoardGivenType = countsPerType[type] / nAccepted;
            probs[type] = pBoardGivenType;
            pBoardSum += pBoardGivenType;
        }
    }

    if (pBoardSum > 0) {
        for (let i = 0; i < probs.length; i++) {
            probs[i] /= pBoardSum;
        }
    }

    return probs;
}

// Calculate probabilities for each panel
export function calculateProbabilities(board, compatibleBoards) {
    const level = board.level;

    if (compatibleBoards.length === 0) {
        return {
            panels: [],
            typeProbs: new Array(NUM_TYPES_PER_LEVEL).fill(0),
            totalCompatible: 0
        };
    }

    const boardsByType = groupBoardsByType(compatibleBoards, level);
    const countsPerType = boardsByType.map(group => group.length);
    const totalCompatible = countsPerType.reduce((a, b) => a + b, 0);
    const typeProbs = calculateTypeProbabilities(level, countsPerType);

    const unknownPositions = board.getUnknownPositions();

    const panelProbs = unknownPositions.map(pos => {
        const probs = { pos, pVoltorb: 0, pOne: 0, pTwo: 0, pThree: 0 };

        for (let value = 0; value <= 3; value++) {
            let pValue = 0;

            for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
                const typeBoards = boardsByType[type];
                if (typeBoards.length === 0) continue;

                let countWithValue = 0;
                for (const b of typeBoards) {
                    if (b.get(pos.row, pos.col) === value) {
                        countWithValue++;
                    }
                }

                const pValueGivenType = countWithValue / typeBoards.length;
                pValue += pValueGivenType * typeProbs[type];
            }

            switch (value) {
                case 0: probs.pVoltorb = pValue; break;
                case 1: probs.pOne = pValue; break;
                case 2: probs.pTwo = pValue; break;
                case 3: probs.pThree = pValue; break;
            }
        }

        return probs;
    });

    return {
        panels: panelProbs,
        typeProbs,
        totalCompatible
    };
}

// Find guaranteed safe panels
export function findSafePanels(board, compatibleBoards) {
    const safePanels = [];
    const unknownPositions = board.getUnknownPositions();

    for (const pos of unknownPositions) {
        let isSafe = true;
        for (const cb of compatibleBoards) {
            if (cb.get(pos.row, pos.col) === PanelValue.Voltorb) {
                isSafe = false;
                break;
            }
        }
        if (isSafe) {
            safePanels.push(pos);
        }
    }

    return safePanels;
}

// ============================================================================
// ITERATIVE DEEPENING SOLVER
// ============================================================================

/**
 * Search state for the minimax algorithm.
 * Tracks compatible boards grouped by type for efficient filtering.
 */
class SearchState {
    constructor(board, boardsByType, pBoardNorm) {
        this.board = board;
        this.boardsByType = boardsByType;
        this.pBoardNorm = pBoardNorm;
    }

    totalCompatible() {
        let total = 0;
        for (const boards of this.boardsByType) {
            total += boards.length;
        }
        return total;
    }
}

/**
 * Check if the game is won (all multipliers revealed).
 */
function isWon(state) {
    const totalBoards = state.boardsByType.reduce((sum, boards) => sum + boards.length, 0);

    // First, count unknown panels
    let unknownCount = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (state.board.get(i, j) === PanelValue.Unknown) {
                unknownCount++;
            }
        }
    }

    if (totalBoards === 0) {
        return unknownCount === 0;
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (state.board.get(i, j) === PanelValue.Unknown) {
                // Check if any compatible board has a multiplier here
                for (const boards of state.boardsByType) {
                    for (const b of boards) {
                        if (isMultiplier(b.get(i, j))) {
                            return false;
                        }
                    }
                }
            }
        }
    }
    return true;
}

/**
 * Check if any compatible board has a multiplier (2 or 3) at this position.
 * Panels without multiplier potential are useless to flip.
 */
function hasMultiplierPotential(state, pos) {
    for (const boards of state.boardsByType) {
        for (const b of boards) {
            if (isMultiplier(b.get(pos.row, pos.col))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Find a free (guaranteed safe) panel.
 */
function findFreePanel(state) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const pos = { row: i, col: j };
            if (state.board.get(i, j) !== PanelValue.Unknown) continue;

            let isFree = true;
            outer: for (const boards of state.boardsByType) {
                for (const b of boards) {
                    if (b.get(pos.row, pos.col) === PanelValue.Voltorb) {
                        isFree = false;
                        break outer;
                    }
                }
            }

            if (isFree && hasMultiplierPotential(state, pos)) return pos;
        }
    }
    return null;
}

/**
 * Get unknown panels sorted by voltorb probability (safest first).
 */
function getOrderedUnknownPanels(state) {
    const panels = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (state.board.get(i, j) === PanelValue.Unknown) {
                const pos = { row: i, col: j };
                if (!hasMultiplierPotential(state, pos)) continue;
                const pVoltorb = probabilityOf(state, pos, PanelValue.Voltorb);
                panels.push({ pos, pVoltorb });
            }
        }
    }

    // Sort by voltorb probability (lowest first)
    panels.sort((a, b) => a.pVoltorb - b.pVoltorb);

    return panels.map(p => p.pos);
}

/**
 * Calculate P(board) normalization factor.
 */
function calculateProbNorm(boardsByType, level) {
    let pBoard = 0;
    for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
        const nAccepted = Number(getAcceptedCount(level, type));
        if (nAccepted > 0) {
            pBoard += boardsByType[type].length / nAccepted;
        }
    }
    return pBoard;
}

/**
 * Calculate probability of a specific value at a position.
 */
function probabilityOf(state, pos, value) {
    if (state.pBoardNorm <= 0) return 0;

    const level = state.board.level;
    let pValue = 0;

    for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
        const typeBoards = state.boardsByType[type];
        if (typeBoards.length === 0) continue;

        const nAccepted = Number(getAcceptedCount(level, type));
        if (nAccepted <= 0) continue;

        let countWithValue = 0;
        for (const b of typeBoards) {
            if (b.get(pos.row, pos.col) === value) {
                countWithValue++;
            }
        }

        const pValueGivenType = countWithValue / typeBoards.length;
        const pTypeWeight = typeBoards.length / nAccepted;
        pValue += pValueGivenType * pTypeWeight / state.pBoardNorm;
    }

    return pValue;
}

/**
 * Create a new search state after revealing a panel.
 */
function revealPanel(state, pos, value) {
    const newBoard = state.board.withPanelRevealed(pos, value);

    // Filter compatible boards
    const newBoardsByType = [];
    for (let type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
        newBoardsByType[type] = state.boardsByType[type].filter(
            b => b.get(pos.row, pos.col) === value
        );
    }

    const newPBoardNorm = calculateProbNorm(newBoardsByType, newBoard.level);

    return new SearchState(newBoard, newBoardsByType, newPBoardNorm);
}

/**
 * Heuristic evaluation for leaf nodes.
 * Returns { lower, upper } bounds on win probability.
 */
function heuristicEval(state) {
    if (isWon(state)) return { lower: 1.0, upper: 1.0 };

    // Count multipliers still needed (max across boards = pessimistic for lower bound)
    let multipliersNeeded = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (state.board.get(i, j) === PanelValue.Unknown) {
                const pos = { row: i, col: j };
                // Check if any board has a multiplier here
                outer: for (const boards of state.boardsByType) {
                    for (const b of boards) {
                        if (isMultiplier(b.get(pos.row, pos.col))) {
                            multipliersNeeded++;
                            break outer;
                        }
                    }
                }
            }
        }
    }

    if (multipliersNeeded === 0) return { lower: 1.0, upper: 1.0 };

    // Compute M_min: minimum unrevealed multipliers across all compatible boards
    let mMin = multipliersNeeded;
    for (const boards of state.boardsByType) {
        for (const b of boards) {
            let boardMult = 0;
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    if (state.board.get(i, j) === PanelValue.Unknown) {
                        if (isMultiplier(b.get(i, j))) {
                            boardMult++;
                        }
                    }
                }
            }
            if (boardMult < mMin) {
                mMin = boardMult;
            }
        }
    }

    // Collect voltorb probabilities for risky panels
    const voltorbProbs = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (state.board.get(i, j) !== PanelValue.Unknown) continue;
            const pos = { row: i, col: j };
            if (!hasMultiplierPotential(state, pos)) continue;
            const pVoltorb = probabilityOf(state, pos, PanelValue.Voltorb);
            if (pVoltorb > 0) {
                voltorbProbs.push(pVoltorb);
            }
        }
    }

    if (voltorbProbs.length === 0) return { lower: 1.0, upper: 1.0 };

    // Sort by risk (lowest first)
    voltorbProbs.sort((a, b) => a - b);

    // Lower bound: survive the safest multipliersNeeded panels
    const panelsLower = Math.min(voltorbProbs.length, multipliersNeeded);
    let lowerProd = 1.0;
    for (let i = 0; i < panelsLower; i++) {
        lowerProd *= (1 - voltorbProbs[i]);
    }

    // Upper bound: survive the safest M_min panels
    // If M_min == 0, some board has all multipliers revealed → upper = 1.0 (empty product)
    let upperProd = 1.0;
    if (mMin > 0) {
        const panelsUpper = Math.min(voltorbProbs.length, mMin);
        for (let i = 0; i < panelsUpper; i++) {
            upperProd *= (1 - voltorbProbs[i]);
        }
    }

    return { lower: lowerProd, upper: upperProd };
}

/**
 * Depth-limited search with memoization.
 */
function depthLimitedSearch(state, depthLimit, memo, nodesRef, startTime, timeout) {
    nodesRef.count++;

    // Timeout check
    if (Date.now() - startTime > timeout) {
        const h = heuristicEval(state);
        return { bestPanel: null, winProb: h.lower, winProbUpper: h.upper, fullyExplored: false };
    }

    // Win check
    if (isWon(state)) {
        return { bestPanel: null, winProb: 1.0, winProbUpper: 1.0, fullyExplored: true };
    }

    // Depth limit reached
    if (depthLimit <= 0) {
        const h = heuristicEval(state);
        return { bestPanel: null, winProb: h.lower, winProbUpper: h.upper, fullyExplored: false };
    }

    // Memoization check
    const memoKey = state.board.compactKey() + '_' + depthLimit;
    if (memo.has(memoKey)) {
        const cached = memo.get(memoKey);
        return { bestPanel: cached.bestPanel, winProb: cached.winProb, winProbUpper: cached.winProbUpper, fullyExplored: cached.fullyExplored };
    }

    // Free panel check
    const freePanel = findFreePanel(state);
    if (freePanel) {
        let winProb = 0;
        let winProbUpper = 0;
        let fullyExplored = true;

        for (let value = 1; value <= 3; value++) {
            const pValue = probabilityOf(state, freePanel, value);
            if (pValue <= 0) continue;

            const nextState = revealPanel(state, freePanel, value);
            const child = depthLimitedSearch(nextState, depthLimit, memo, nodesRef, startTime, timeout);

            winProb += pValue * child.winProb;
            winProbUpper += pValue * child.winProbUpper;
            if (!child.fullyExplored) fullyExplored = false;
        }

        memo.set(memoKey, { bestPanel: freePanel, winProb, winProbUpper, fullyExplored });
        return { bestPanel: freePanel, winProb, winProbUpper, fullyExplored };
    }

    // Get unknown panels in heuristic order
    const unknownPanels = getOrderedUnknownPanels(state);

    if (unknownPanels.length === 0) {
        return { bestPanel: null, winProb: 0, winProbUpper: 0, fullyExplored: true };
    }

    let bestPanel = unknownPanels[0];
    let bestWinProb = 0;
    let bestWinProbUpper = 0;
    let allFullyExplored = true;

    for (const pos of unknownPanels) {
        // Upper-bound pruning
        const upperBound = 1 - probabilityOf(state, pos, PanelValue.Voltorb);
        if (upperBound <= bestWinProb) continue;

        let panelWinProb = 0;
        let panelWinProbUpper = 0;
        let panelFullyExplored = true;

        for (let value = 1; value <= 3; value++) {
            const pValue = probabilityOf(state, pos, value);
            if (pValue <= 0) continue;

            const nextState = revealPanel(state, pos, value);
            const child = depthLimitedSearch(nextState, depthLimit - 1, memo, nodesRef, startTime, timeout);

            panelWinProb += pValue * child.winProb;
            panelWinProbUpper += pValue * child.winProbUpper;
            if (!child.fullyExplored) panelFullyExplored = false;
        }

        if (!panelFullyExplored) allFullyExplored = false;

        if (panelWinProb > bestWinProb) {
            bestWinProb = panelWinProb;
            bestPanel = pos;
        }
        if (panelWinProbUpper > bestWinProbUpper) {
            bestWinProbUpper = panelWinProbUpper;
        }

        // Timeout check
        if (Date.now() - startTime > timeout) {
            allFullyExplored = false;
            break;
        }
    }

    memo.set(memoKey, { bestPanel, winProb: bestWinProb, winProbUpper: bestWinProbUpper, fullyExplored: allFullyExplored });
    return { bestPanel, winProb: bestWinProb, winProbUpper: bestWinProbUpper, fullyExplored: allFullyExplored };
}

/**
 * Iterative deepening solver.
 * Yields progress updates at each depth level.
 */
export function* iterativeDeepening(board, compatibleBoards, options = {}) {
    const { maxDepth = 100, timeout = 10000 } = options;

    const level = board.level;
    const boardsByType = groupBoardsByType(compatibleBoards, level);
    const pBoardNorm = calculateProbNorm(boardsByType, level);

    const initialState = new SearchState(board, boardsByType, pBoardNorm);

    const startTime = Date.now();
    let nodesRef = { count: 0 };

    // Check for free panel first
    const freePanel = findFreePanel(initialState);

    for (let depth = 1; depth <= maxDepth; depth++) {
        // CRITICAL: Create fresh memo for each depth iteration.
        // Reusing memo across depths causes child states to return cached results
        // from shallower searches, effectively limiting all searches to depth 1.
        const memo = new Map();

        const result = depthLimitedSearch(initialState, depth, memo, nodesRef, startTime, timeout);

        const elapsed = Date.now() - startTime;

        yield {
            bestPanel: freePanel || result.bestPanel,
            winProbability: result.winProb,
            winProbabilityUpper: result.winProbUpper,
            depth,
            isExact: result.fullyExplored,
            nodesSearched: nodesRef.count,
            elapsed,
            reason: freePanel ? 'Free panel (guaranteed safe)' : (result.fullyExplored ? 'Exact solution' : `Depth ${depth}`)
        };

        if (result.fullyExplored || elapsed >= timeout) {
            break;
        }
    }
}

/**
 * Main solver function with iterative deepening.
 */
export function solve(board, maxBoards = 500000, options = {}) {
    const startTime = performance.now();
    const { timeout = 5000 } = options;

    // Generate compatible boards
    const compatibleBoards = generateCompatibleBoards(board, maxBoards);

    const capped = compatibleBoards.length >= maxBoards;

    if (compatibleBoards.length === 0) {
        return {
            suggestedPanel: null,
            winProbability: 0,
            probabilities: { panels: [], typeProbs: [], totalCompatible: 0 },
            safePanels: [],
            compatibleCount: 0,
            capped: false,
            computeTime: performance.now() - startTime,
            depth: 0,
            isExact: true,
            reason: 'No compatible boards'
        };
    }

    // Calculate probabilities
    const probabilities = calculateProbabilities(board, compatibleBoards);

    // Find safe panels
    const safePanels = findSafePanels(board, compatibleBoards);

    // Run iterative deepening
    let finalResult = null;
    for (const progress of iterativeDeepening(board, compatibleBoards, { timeout })) {
        finalResult = progress;
    }

    // Determine suggested panel
    let suggestedPanel = finalResult?.bestPanel;

    // If we have safe panels and no solver result, prefer safe panel with highest expected value
    if (safePanels.length > 0 && !suggestedPanel) {
        let bestSafe = safePanels[0];
        let bestScore = -1;

        for (const pos of safePanels) {
            const panelProb = probabilities.panels.find(p =>
                p.pos.row === pos.row && p.pos.col === pos.col
            );
            if (panelProb) {
                const score = panelProb.pOne * 1 + panelProb.pTwo * 2 + panelProb.pThree * 3;
                if (score > bestScore) {
                    bestScore = score;
                    bestSafe = pos;
                }
            }
        }
        suggestedPanel = bestSafe;
    }

    return {
        suggestedPanel,
        winProbability: finalResult?.winProbability ?? 0,
        winProbabilityUpper: finalResult?.winProbabilityUpper,
        probabilities,
        safePanels,
        compatibleCount: compatibleBoards.length,
        capped,
        computeTime: performance.now() - startTime,
        depth: finalResult?.depth ?? 0,
        isExact: finalResult?.isExact ?? false,
        reason: finalResult?.reason ?? 'Unknown'
    };
}

/**
 * Progressive solver that yields to the browser between depth iterations.
 * Calls onProgress after each depth, onComplete when done.
 * Returns a cancel function.
 */
export function solveProgressive(board, onProgress, onComplete, maxBoards = 500000, options = {}) {
    const { timeout = 5000 } = options;
    const startTime = performance.now();

    // Phase 1 & 2: Generate boards + probabilities (sync, fast)
    const compatibleBoards = generateCompatibleBoards(board, maxBoards);
    const capped = compatibleBoards.length >= maxBoards;

    if (compatibleBoards.length === 0) {
        const result = {
            suggestedPanel: null,
            winProbability: 0,
            probabilities: { panels: [], typeProbs: [], totalCompatible: 0 },
            safePanels: [],
            compatibleCount: 0,
            capped: false,
            computeTime: performance.now() - startTime,
            depth: 0,
            isExact: true,
            reason: 'No compatible boards'
        };
        onComplete(result);
        return () => {};
    }

    const probabilities = calculateProbabilities(board, compatibleBoards);
    const safePanels = findSafePanels(board, compatibleBoards);

    // Phase 3: Iterative deepening, one depth at a time via setTimeout
    const gen = iterativeDeepening(board, compatibleBoards, { timeout });
    let cancelled = false;
    let lastResult = null;

    function buildResult(progress) {
        let suggestedPanel = progress.bestPanel;
        if (safePanels.length > 0 && !suggestedPanel) {
            let bestSafe = safePanels[0];
            let bestScore = -1;
            for (const pos of safePanels) {
                const panelProb = probabilities.panels.find(p =>
                    p.pos.row === pos.row && p.pos.col === pos.col
                );
                if (panelProb) {
                    const score = panelProb.pOne * 1 + panelProb.pTwo * 2 + panelProb.pThree * 3;
                    if (score > bestScore) {
                        bestScore = score;
                        bestSafe = pos;
                    }
                }
            }
            suggestedPanel = bestSafe;
        }
        return {
            suggestedPanel,
            winProbability: progress.winProbability,
            winProbabilityUpper: progress.winProbabilityUpper,
            probabilities,
            safePanels,
            compatibleCount: compatibleBoards.length,
            capped,
            computeTime: performance.now() - startTime,
            depth: progress.depth,
            isExact: progress.isExact,
            reason: progress.reason
        };
    }

    function runNextDepth() {
        if (cancelled) return;

        const { value, done } = gen.next();
        if (done || !value) {
            if (lastResult) onComplete(lastResult);
            return;
        }

        lastResult = buildResult(value);
        onProgress(lastResult);

        if (value.isExact || (performance.now() - startTime) >= timeout) {
            onComplete(lastResult);
            return;
        }

        setTimeout(runNextDepth, 0);
    }

    setTimeout(runNextDepth, 0);

    return () => { cancelled = true; };
}

// For backward compatibility
export function findBestPanel(board, probabilities) {
    if (probabilities.panels.length === 0) {
        return null;
    }

    let bestPanel = null;
    let lowestVoltorbProb = 1.1;

    for (const panelProb of probabilities.panels) {
        const score = panelProb.pVoltorb - (panelProb.pTwo + panelProb.pThree) * 0.01;
        if (score < lowestVoltorbProb) {
            lowestVoltorbProb = score;
            bestPanel = panelProb.pos;
        }
    }

    return bestPanel;
}

export function estimateWinProbability(board, compatibleBoards, probabilities) {
    // This is now a fallback - the main solver uses iterative deepening
    const result = solve(board, compatibleBoards.length);
    return result.winProbability;
}
