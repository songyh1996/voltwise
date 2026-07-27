import { PanelValue } from "./boardTypes.js";

const samePosition = (left, right) =>
    left?.row === right?.row && left?.col === right?.col;

export function countNumberedReveals(panels) {
    return panels.flat().filter(value =>
        value >= PanelValue.One && value <= PanelValue.Three
    ).length;
}

function panelProbability(probabilities, pos) {
    return probabilities.panels?.find(panel =>
        samePosition(panel.pos, pos)
    ) ?? null;
}

/**
 * Prefer the most valuable guaranteed-safe card until enough numbered cards
 * have been revealed to prevent a level drop. A known-safe 1 is deliberately
 * included: it does not help clear the board, but it does count toward the
 * game's level-retention rule.
 */
export function prioritizeLevelProtection({
    level,
    panels,
    probabilities,
    safePanels,
    suggestedPanel,
    capped = false
}) {
    const revealed = countNumberedReveals(panels);
    const target = Math.max(1, level);
    const protectedLevel = revealed >= target;
    let protectedSuggestion = suggestedPanel;
    let prioritizing = false;

    if (!protectedLevel && !capped && safePanels.length > 0) {
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const pos of safePanels) {
            const probability = panelProbability(probabilities, pos);
            const score = probability
                ? probability.pOne + probability.pTwo * 2 + probability.pThree * 3
                : 0;

            if (score > bestScore) {
                bestScore = score;
                protectedSuggestion = pos;
            }
        }

        prioritizing = !samePosition(protectedSuggestion, suggestedPanel) ||
            safePanels.some(pos => samePosition(pos, protectedSuggestion));
    }

    return {
        suggestedPanel: protectedSuggestion,
        revealed,
        target,
        remaining: Math.max(0, target - revealed),
        protected: protectedLevel,
        prioritizing
    };
}
