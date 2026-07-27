const BOARD_SIZE = 5;
const MAX_PAYOUT = 50000;
const MAX_LEVEL = 8;

export function calculateCurrentPayout(panels) {
    let hasSafeReveal = false;
    let payout = 1;

    for (const row of panels) {
        for (const value of row) {
            if (value > 0) {
                hasSafeReveal = true;
                payout = Math.min(MAX_PAYOUT, payout * value);
            }
        }
    }

    return hasSafeReveal ? payout : 0;
}

export function calculateMaximumPayout(n2, n3) {
    let payout = 1;
    for (let i = 0; i < n2; i++) payout = Math.min(MAX_PAYOUT, payout * 2);
    for (let i = 0; i < n3; i++) payout = Math.min(MAX_PAYOUT, payout * 3);
    return payout;
}

export function allMultipliersRevealed(rowHints, panels) {
    if (
        rowHints.length !== BOARD_SIZE ||
        panels.length !== BOARD_SIZE ||
        rowHints.some(hint => !Number.isInteger(hint.sum) || !Number.isInteger(hint.voltorbCount))
    ) {
        return false;
    }

    const totalSum = rowHints.reduce((sum, hint) => sum + hint.sum, 0);
    const totalVoltorbs = rowHints.reduce((sum, hint) => sum + hint.voltorbCount, 0);
    const totalExtraPoints = totalSum - (BOARD_SIZE * BOARD_SIZE - totalVoltorbs);

    let revealedExtraPoints = 0;
    for (const row of panels) {
        for (const value of row) {
            if (value === 2) revealedExtraPoints += 1;
            if (value === 3) revealedExtraPoints += 2;
        }
    }

    return totalExtraPoints > 0 && revealedExtraPoints >= totalExtraPoints;
}

export function levelAfterWin(level) {
    return Math.min(MAX_LEVEL, Math.max(1, level + 1));
}
