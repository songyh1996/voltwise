import { Board } from "./docs/js/board.js";
import { findAllowedRevealValues } from "./docs/js/revealOptions.js";

function hydrateBoard(data) {
  const board = new Board(data.level);
  for (let row = 0; row < 5; row++) {
    board.setRowHint(row, data.rowHints[row]);
    board.setColHint(row, data.colHints[row]);
    for (let col = 0; col < 5; col++) {
      board.set(row, col, data.panels[row][col]);
    }
  }
  return board;
}

self.addEventListener("message", event => {
  if (event.data.type !== "reveal-options") return;

  const { token, row, col } = event.data;
  try {
    const board = hydrateBoard(event.data.board);
    const allowedValues = findAllowedRevealValues(board, row, col);
    self.postMessage({ type: "reveal-options", token, allowedValues });
  } catch (error) {
    self.postMessage({
      type: "reveal-options-error",
      token,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
