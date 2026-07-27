import test from "node:test";
import assert from "node:assert/strict";

import {
  countNumberedReveals,
  prioritizeLevelProtection
} from "../docs/js/levelProtection.js";
import { PanelValue } from "../docs/js/boardTypes.js";

const position = (row, col) => ({ row, col });

test("every revealed numbered card counts toward level protection", () => {
  const panels = Array.from(
    { length: 5 },
    () => Array(5).fill(PanelValue.Unknown)
  );
  panels[0][0] = PanelValue.One;
  panels[0][1] = PanelValue.Two;
  panels[0][2] = PanelValue.Three;
  panels[0][3] = PanelValue.Voltorb;

  assert.equal(countNumberedReveals(panels), 3);
});

test("an unprotected level prioritizes a guaranteed-safe card before a gamble", () => {
  const panels = Array.from(
    { length: 5 },
    () => Array(5).fill(PanelValue.Unknown)
  );
  panels[0][0] = PanelValue.One;
  panels[0][1] = PanelValue.One;

  const result = prioritizeLevelProtection({
    level: 5,
    panels,
    probabilities: {
      panels: [
        {
          pos: position(1, 1),
          pVoltorb: 0,
          pOne: 1,
          pTwo: 0,
          pThree: 0
        },
        {
          pos: position(2, 2),
          pVoltorb: 0,
          pOne: 0,
          pTwo: 0,
          pThree: 1
        },
        {
          pos: position(4, 4),
          pVoltorb: 0.1,
          pOne: 0,
          pTwo: 0.9,
          pThree: 0
        }
      ]
    },
    safePanels: [position(1, 1), position(2, 2)],
    suggestedPanel: position(4, 4),
    capped: false
  });

  assert.deepEqual(result.suggestedPanel, position(2, 2));
  assert.equal(result.revealed, 2);
  assert.equal(result.remaining, 3);
  assert.equal(result.protected, false);
  assert.equal(result.prioritizing, true);
});

test("the clear solver keeps control once the current level is protected", () => {
  const panels = Array.from(
    { length: 5 },
    () => Array(5).fill(PanelValue.Unknown)
  );
  for (let col = 0; col < 5; col++) {
    panels[0][col] = PanelValue.One;
  }
  const clearSuggestion = position(4, 4);

  const result = prioritizeLevelProtection({
    level: 5,
    panels,
    probabilities: { panels: [] },
    safePanels: [position(1, 1)],
    suggestedPanel: clearSuggestion,
    capped: false
  });

  assert.deepEqual(result.suggestedPanel, clearSuggestion);
  assert.equal(result.protected, true);
  assert.equal(result.prioritizing, false);
});

test("sample-only safe cards never override a capped clear search", () => {
  const panels = Array.from(
    { length: 5 },
    () => Array(5).fill(PanelValue.Unknown)
  );
  const clearSuggestion = position(4, 4);

  const result = prioritizeLevelProtection({
    level: 6,
    panels,
    probabilities: { panels: [] },
    safePanels: [position(1, 1)],
    suggestedPanel: clearSuggestion,
    capped: true
  });

  assert.deepEqual(result.suggestedPanel, clearSuggestion);
  assert.equal(result.prioritizing, false);
});
