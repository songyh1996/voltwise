import test from "node:test";
import assert from "node:assert/strict";

import { Board } from "../docs/js/board.js";
import { PanelValue } from "../docs/js/boardTypes.js";
import {
  calculateProbabilities,
  generateCompatibleBoards,
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
