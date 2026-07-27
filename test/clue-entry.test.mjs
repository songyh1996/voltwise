import test from "node:test";
import assert from "node:assert/strict";

import {
  autoAdvanceDelay,
  possibleDoubleDigitLineSums,
  promotePointTotal
} from "../docs/js/clueEntry.js";
import { BOARD_TYPES } from "../docs/js/boardTypes.js";

test("single-digit clue values auto-advance", () => {
  assert.equal(autoAdvanceDelay("sum", "7"), 0);
  assert.equal(autoAdvanceDelay("voltorbCount", "0"), 0);
  assert.equal(autoAdvanceDelay("voltorbCount", "5"), 0);
});

test("a leading one advances immediately while valid two-digit totals remain typeable", () => {
  assert.equal(autoAdvanceDelay("sum", "1"), 0);
  assert.equal(autoAdvanceDelay("sum", "10"), 0);
  assert.equal(autoAdvanceDelay("sum", "15"), 0);
});

test("double-digit promotion follows the selected level's real board types", () => {
  assert.deepEqual(
    [...possibleDoubleDigitLineSums(BOARD_TYPES[0])].sort((a, b) => a - b),
    [10]
  );
  assert.deepEqual(
    [...possibleDoubleDigitLineSums(BOARD_TYPES[1])].sort((a, b) => a - b),
    [10, 11, 12]
  );
  assert.equal(promotePointTotal(BOARD_TYPES[0], "0"), 10);
  assert.equal(promotePointTotal(BOARD_TYPES[0], "1"), null);
  assert.equal(promotePointTotal(BOARD_TYPES[1], "2"), 12);
  assert.equal(promotePointTotal(BOARD_TYPES[7], "3"), null);
  assert.equal(promotePointTotal(BOARD_TYPES[7], "4"), null);
});

test("invalid clue text does not move focus", () => {
  assert.equal(autoAdvanceDelay("sum", ""), null);
  assert.equal(autoAdvanceDelay("sum", "16"), null);
  assert.equal(autoAdvanceDelay("sum", "01"), null);
  assert.equal(autoAdvanceDelay("voltorbCount", "6"), null);
  assert.equal(autoAdvanceDelay("voltorbCount", "12"), null);
});
