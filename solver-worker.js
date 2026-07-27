import { Board } from "./docs/js/board.js";
import { solveProgressive } from "./docs/js/solver.js";

let cancelCurrent = null;

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
  if (event.data.type !== "solve") return;

  cancelCurrent?.();
  const { token, options } = event.data;

  try {
    const board = hydrateBoard(event.data.board);
    cancelCurrent = solveProgressive(
      board,
      result => self.postMessage({ type: "progress", token, result }),
      result => self.postMessage({ type: "complete", token, result }),
      options.maxBoards,
      { timeout: options.timeout }
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      token,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
