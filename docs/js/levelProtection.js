import { PanelValue } from "./boardTypes.js";

const samePosition = (left, right) =>
    left?.row === right?.row && left?.col === right?.col;

export function countNumberedReveals(panels) {
    return panels.flat().filter(value =>
        value >= PanelValue.One && value <= PanelValue.Three
    ).length;
}

/**
 * Minimize immediate Voltorb risk until enough numbered cards have been
 * revealed to prevent a level drop. Expected card value breaks equal-risk
 * ties. A 1 is deliberately eligible: it does not help clear the board, but
 * it does count toward the game's level-retention rule.
 */
export function prioritizeLevelProtection({
    level,
    panels,
    probabilities,
    suggestedPanel,
    capped = false
}) {
    const revealed = countNumberedReveals(panels);
    const target = Math.max(1, level);
    const protectedLevel = revealed >= target;
    let protectedSuggestion = suggestedPanel;
    let prioritizing = false;
    let suggestedRisk = null;

    if (!protectedLevel && !capped && probabilities.panels?.length > 0) {
        let bestProbability = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const probability of probabilities.panels) {
            const score =
                probability.pOne +
                probability.pTwo * 2 +
                probability.pThree * 3;
            const lowerRisk = !bestProbability ||
                probability.pVoltorb < bestProbability.pVoltorb - 1e-12;
            const equalRisk = bestProbability &&
                Math.abs(probability.pVoltorb - bestProbability.pVoltorb) <= 1e-12;

            if (lowerRisk || (equalRisk && score > bestScore)) {
                bestProbability = probability;
                bestScore = score;
            }
        }

        if (bestProbability) {
            protectedSuggestion = bestProbability.pos;
            suggestedRisk = bestProbability.pVoltorb;
            prioritizing = true;
        }
    }

    return {
        suggestedPanel: protectedSuggestion,
        suggestedRisk,
        revealed,
        target,
        remaining: Math.max(0, target - revealed),
        protected: protectedLevel,
        prioritizing,
        overridesClear: prioritizing &&
            !samePosition(protectedSuggestion, suggestedPanel)
    };
}
