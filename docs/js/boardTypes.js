// Board Type Definitions for Voltorb Flip
// Ported from C++ src/board_type.cpp

export const BOARD_SIZE = 5;
export const TOTAL_PANELS = 25;
export const MAX_LEVEL = 8;
export const MIN_LEVEL = 1;
export const NUM_TYPES_PER_LEVEL = 10;

// Panel values
export const PanelValue = {
    Unknown: -1,
    Voltorb: 0,
    One: 1,
    Two: 2,
    Three: 3
};

// Game results
export const GameResult = {
    InProgress: 0,
    Won: 1,
    Lost: 2
};

// Board type parameters: {n0, n2, n3, maxTotalFree, maxRowFree}
// n0 = voltorbs, n2 = twos, n3 = threes
// n1 (ones) = 25 - n0 - n2 - n3
// totalSum = n1 + 2*n2 + 3*n3
export const BOARD_TYPES = [
    // Level 1 (index 0)
    [
        { n0: 6, n2: 3, n3: 1, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 6, n2: 0, n3: 3, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 6, n2: 5, n3: 0, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 6, n2: 2, n3: 2, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 6, n2: 4, n3: 1, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 6, n2: 3, n3: 1, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 6, n2: 0, n3: 3, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 6, n2: 5, n3: 0, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 6, n2: 2, n3: 2, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 6, n2: 4, n3: 1, maxTotalFree: 4, maxRowFree: 3 }
    ],
    // Level 2 (index 1)
    [
        { n0: 7, n2: 1, n3: 3, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 7, n2: 6, n3: 0, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 7, n2: 3, n3: 2, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 7, n2: 0, n3: 4, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 7, n2: 5, n3: 1, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 7, n2: 1, n3: 3, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 7, n2: 6, n3: 0, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 7, n2: 3, n3: 2, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 7, n2: 0, n3: 4, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 7, n2: 5, n3: 1, maxTotalFree: 3, maxRowFree: 3 }
    ],
    // Level 3 (index 2)
    [
        { n0: 8, n2: 2, n3: 3, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 8, n2: 7, n3: 0, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 8, n2: 4, n3: 2, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 8, n2: 1, n3: 4, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 8, n2: 6, n3: 1, maxTotalFree: 3, maxRowFree: 4 },
        { n0: 8, n2: 2, n3: 3, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 8, n2: 7, n3: 0, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 8, n2: 4, n3: 2, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 8, n2: 1, n3: 4, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 8, n2: 6, n3: 1, maxTotalFree: 3, maxRowFree: 3 }
    ],
    // Level 4 (index 3)
    [
        { n0: 8, n2: 3, n3: 3, maxTotalFree: 3, maxRowFree: 4 },
        { n0: 8, n2: 0, n3: 5, maxTotalFree: 3, maxRowFree: 2 },
        { n0: 10, n2: 8, n3: 0, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 5, n3: 2, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 2, n3: 4, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 8, n2: 3, n3: 3, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 8, n2: 0, n3: 5, maxTotalFree: 2, maxRowFree: 2 },
        { n0: 10, n2: 8, n3: 0, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 5, n3: 2, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 2, n3: 4, maxTotalFree: 3, maxRowFree: 3 }
    ],
    // Level 5 (index 4)
    [
        { n0: 10, n2: 7, n3: 1, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 4, n3: 3, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 1, n3: 5, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 9, n3: 0, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 6, n3: 2, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 7, n3: 1, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 4, n3: 3, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 1, n3: 5, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 9, n3: 0, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 6, n3: 2, maxTotalFree: 4, maxRowFree: 4 }
    ],
    // Level 6 (index 5)
    [
        { n0: 10, n2: 3, n3: 4, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 0, n3: 6, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 8, n3: 1, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 5, n3: 3, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 2, n3: 5, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 3, n3: 4, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 0, n3: 6, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 8, n3: 1, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 5, n3: 3, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 2, n3: 5, maxTotalFree: 3, maxRowFree: 3 }
    ],
    // Level 7 (index 6)
    [
        { n0: 10, n2: 7, n3: 2, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 4, n3: 4, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 13, n2: 1, n3: 6, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 13, n2: 9, n3: 1, maxTotalFree: 6, maxRowFree: 5 },
        { n0: 10, n2: 6, n3: 3, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 7, n3: 2, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 4, n3: 4, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 13, n2: 1, n3: 6, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 13, n2: 9, n3: 1, maxTotalFree: 5, maxRowFree: 5 },
        { n0: 10, n2: 6, n3: 3, maxTotalFree: 4, maxRowFree: 4 }
    ],
    // Level 8 (index 7)
    [
        { n0: 10, n2: 0, n3: 7, maxTotalFree: 4, maxRowFree: 3 },
        { n0: 10, n2: 8, n3: 2, maxTotalFree: 6, maxRowFree: 5 },
        { n0: 10, n2: 5, n3: 4, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 2, n3: 6, maxTotalFree: 5, maxRowFree: 4 },
        { n0: 10, n2: 7, n3: 3, maxTotalFree: 6, maxRowFree: 5 },
        { n0: 10, n2: 0, n3: 7, maxTotalFree: 3, maxRowFree: 3 },
        { n0: 10, n2: 8, n3: 2, maxTotalFree: 5, maxRowFree: 5 },
        { n0: 10, n2: 5, n3: 4, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 2, n3: 6, maxTotalFree: 4, maxRowFree: 4 },
        { n0: 10, n2: 7, n3: 3, maxTotalFree: 5, maxRowFree: 5 }
    ]
];

// N_accepted = valid boards (after legality check)
// Used for Bayesian probability calculation
export const N_ACCEPTED = [
    // Level 1
    [
        1732660000n, 81056200n, 1407934200n, 2598990000n, 7039671000n,
        1732660000n, 81056200n, 1407934200n, 2598990000n, 7039671000n
    ],
    // Level 2
    [
        3285100800n, 5722710400n, 17316544000n, 821275200n, 34336262400n,
        2684683200n, 4495352000n, 14348488000n, 671170800n, 26972112000n
    ],
    // Level 3
    [
        34984058000n, 12979316000n, 145577634000n, 17492029000n, 81740052800n,
        32177972000n, 11677150400n, 128566014000n, 16088986000n, 81740052800n
    ],
    // Level 4
    [
        171421352000n, 3498405800n, 18355191900n, 335965442400n, 204113718000n,
        171421352000n, 3217797200n, 17976411900n, 331634822400n, 199722318000n
    ],
    // Level 5
    [
        146841535200n, 559942404000n, 81645487200n, 13300405700n, 513945373200n,
        143811295200n, 552724704000n, 79888927200n, 13159573700n, 503339533200n
    ],
    // Level 6
    [
        559942404000n, 13607581200n, 119703651300n, 1027890746400n, 335965442400n,
        552724704000n, 13314821200n, 118436163300n, 1006679066400n, 331634822400n
    ],
    // Level 7
    [
        478814605200n, 1284863433000n, 25901458800n, 3265542000n, 1117234078800n,
        473744653200n, 1258348833000n, 25901458800n, 3265542000n, 1105404190800n
    ],
    // Level 8
    [
        15998354400n, 400990788900n, 1675851118200n, 513945373200n, 1069308770400n,
        15792134400n, 394129278900n, 1658106286200n, 503339533200n, 1051011410400n
    ]
];

// Helper functions
export function getParams(level, type) {
    return BOARD_TYPES[level - 1][type];
}

export function getAcceptedCount(level, type) {
    return N_ACCEPTED[level - 1][type];
}

export function getN1(params) {
    return TOTAL_PANELS - params.n0 - params.n2 - params.n3;
}

export function getTotalSum(params) {
    const n1 = getN1(params);
    return n1 + 2 * params.n2 + 3 * params.n3;
}

export function isMultiplier(value) {
    return value === PanelValue.Two || value === PanelValue.Three;
}

export function isKnown(value) {
    return value !== PanelValue.Unknown;
}

// Check if a board's hints are compatible with a given type
export function isCompatibleWithType(totalVoltorbs, totalSum, level, type) {
    const params = getParams(level, type);
    if (params.n0 !== totalVoltorbs) return false;
    const expectedSum = getTotalSum(params);
    return expectedSum === totalSum;
}
