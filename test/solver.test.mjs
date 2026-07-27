import test from "node:test";
import assert from "node:assert/strict";

import { Board } from "../docs/js/board.js";
import { PanelValue } from "../docs/js/boardTypes.js";
import {
  allMultipliersRevealed,
  calculateCurrentPayout,
  levelAfterWin
} from "../docs/js/gameProgress.js";
import { findAllowedRevealValues } from "../docs/js/revealOptions.js";
import {
  calculateProbabilities,
  generateCompatibleBoards,
  iterativeCoinDeepening,
  panelsDontExceedConstraints
} from "../docs/js/solver.js";

const solvedPanels = [
  [1, 1, 0, 2, 1],
  [0, 1, 1, 1, 1],
  [1, 3, 1, 0, 1],
  [1, 0, 2, 1, 0],
  [2, 1, 1, 0, 1]
];

const rowHints = [
  { sum: 5, voltorbCount: 1 },
  { sum: 4, voltorbCount: 1 },
  { sum: 6, voltorbCount: 1 },
  { sum: 4, voltorbCount: 2 },
  { sum: 5, voltorbCount: 1 }
];

const colHints = [
  { sum: 5, voltorbCount: 1 },
  { sum: 6, voltorbCount: 1 },
  { sum: 5, voltorbCount: 1 },
  { sum: 4, voltorbCount: 2 },
  { sum: 4, voltorbCount: 1 }
];

function sampleBoard(covered = false) {
  const board = new Board(1);
  for (let row = 0; row < 5; row++) {
    board.setRowHint(row, rowHints[row]);
    board.setColHint(row, colHints[row]);
    for (let col = 0; col < 5; col++) {
      board.set(row, col, covered ? PanelValue.Unknown : solvedPanels[row][col]);
    }
  }
  return board;
}

test("a fully specified legal board is enumerated exactly once", () => {
  const boards = generateCompatibleBoards(sampleBoard(false), 100);
  assert.equal(boards.length, 1);
  assert.deepEqual(boards[0].panels, solvedPanels);
});

test("probabilities become certain when one panel remains unknown", () => {
  const board = sampleBoard(false);
  board.set(0, 3, PanelValue.Unknown);

  const compatible = generateCompatibleBoards(board, 100);
  const probabilities = calculateProbabilities(board, compatible);
  const panel = probabilities.panels.find(item => item.pos.row === 0 && item.pos.col === 3);

  assert.equal(compatible.length, 1);
  assert.equal(panel.pVoltorb, 0);
  assert.equal(panel.pTwo, 1);
});

test("reveals that exceed a clue are rejected before enumeration", () => {
  const board = sampleBoard(true);
  board.set(0, 0, 3);
  board.set(0, 1, 3);

  assert.equal(panelsDontExceedConstraints(board), false);
  assert.equal(generateCompatibleBoards(board, 100).length, 0);
});

test("row and column clues from the sample agree", () => {
  const rowSum = rowHints.reduce((sum, hint) => sum + hint.sum, 0);
  const colSum = colHints.reduce((sum, hint) => sum + hint.sum, 0);
  const rowVoltorbs = rowHints.reduce((sum, hint) => sum + hint.voltorbCount, 0);
  const colVoltorbs = colHints.reduce((sum, hint) => sum + hint.voltorbCount, 0);

  assert.equal(rowSum, colSum);
  assert.equal(rowVoltorbs, colVoltorbs);
});

test("the final multiplier is detected from total extra points", () => {
  const panels = Array.from({ length: 5 }, () => Array(5).fill(PanelValue.Unknown));
  panels[0][3] = 2;
  panels[2][1] = 3;
  panels[3][2] = 2;

  assert.equal(allMultipliersRevealed(rowHints, panels), false);

  panels[4][0] = 2;
  assert.equal(allMultipliersRevealed(rowHints, panels), true);
  assert.equal(calculateCurrentPayout(panels), 24);
  assert.equal(levelAfterWin(5), 6);
  assert.equal(levelAfterWin(8), 8);
});

test("coin branch-and-bound proves a guaranteed multiplier should be flipped", () => {
  const board = sampleBoard(true);
  const target = { row: 0, col: 3 };

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const value = solvedPanels[row][col];
      if (value > 0 && (row !== target.row || col !== target.col)) {
        board.set(row, col, value);
      }
    }
  }

  const compatible = generateCompatibleBoards(board, 100);
  const progress = iterativeCoinDeepening(board, compatible, { timeout: 1000 }).next().value;

  assert.equal(compatible.length, 1);
  assert.deepEqual(progress.bestPanel, target);
  assert.equal(progress.decision, "continue");
  assert.equal(progress.optimalityProven, true);
  assert.equal(progress.expectedCoinsLower, 24);
  assert.equal(progress.expectedCoinsUpper, 24);
});

test("impossible reveal values are filtered and an incorrect tile stays editable", () => {
  const board = new Board(4);
  const screenshotRows = [
    [7, 0], [5, 2], [3, 2], [5, 2], [7, 2]
  ];
  const screenshotCols = [
    [7, 0], [4, 1], [5, 2], [4, 3], [7, 2]
  ];

  for (let index = 0; index < 5; index++) {
    board.setRowHint(index, {
      sum: screenshotRows[index][0],
      voltorbCount: screenshotRows[index][1]
    });
    board.setColHint(index, {
      sum: screenshotCols[index][0],
      voltorbCount: screenshotCols[index][1]
    });
  }

  board.set(0, 0, 1);
  board.set(0, 2, 1);
  board.set(0, 3, 1);
  board.set(0, 4, 3);
  board.set(1, 0, 1); // Incorrect entry shown in the screenshot.
  board.set(3, 0, 1);
  board.set(4, 0, 1);

  assert.equal(generateCompatibleBoards(board, 1).length, 0);
  assert.deepEqual(findAllowedRevealValues(board, 1, 0), [3]);
  assert.equal(board.get(1, 0), 1);
});
