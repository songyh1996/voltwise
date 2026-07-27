import { Board } from "./docs/js/board.js";
import {
  calculateProbabilities,
  findSafePanels,
  generateCompatibleBoards,
  solveCoinProgressive,
  solveProgressive
} from "./docs/js/solver.js";
import { prioritizeLevelProtection } from "./docs/js/levelProtection.js";

const WASM_MODULE_URL = new URL("./docs/js/solver-wasm.js?v=9", import.meta.url).href;
const WASM_BINARY_URL = new URL("./docs/js/voltorb_wasm.wasm?v=9", import.meta.url).href;

let cancelCurrent = null;
let wasmModulePromise = null;

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

function loadWasm() {
  if (!wasmModulePromise) {
    wasmModulePromise = import(WASM_MODULE_URL)
      .then(({ default: createModule }) => createModule({
        locateFile: path => path.endsWith(".wasm") ? WASM_BINARY_URL : path
      }))
      .catch(error => {
        wasmModulePromise = null;
        throw error;
      });
  }
  return wasmModulePromise;
}

function validSuggestedPanel(suggestedPanel, probabilities) {
  if (!suggestedPanel) return null;
  const valid = probabilities.panels.some(panel =>
    panel.pos.row === suggestedPanel.row &&
    panel.pos.col === suggestedPanel.col
  );
  return valid ? suggestedPanel : null;
}

function samePosition(left, right) {
  return left?.row === right?.row && left?.col === right?.col;
}

function bestSafePanel(safePanels, probabilities) {
  let best = safePanels[0] ?? null;
  let bestScore = -1;

  for (const pos of safePanels) {
    const panel = probabilities.panels.find(item => samePosition(item.pos, pos));
    if (!panel) continue;
    const score = panel.pOne + panel.pTwo * 2 + panel.pThree * 3;
    if (score > bestScore) {
      best = pos;
      bestScore = score;
    }
  }

  return best;
}

function buildClearResult(
  progress,
  probabilities,
  safePanels,
  compatibleCount,
  capped,
  startTime,
  engine,
  boardData
) {
  let suggestedPanel = validSuggestedPanel(progress.bestPanel, probabilities);
  if (!suggestedPanel && safePanels.length > 0) {
    suggestedPanel = bestSafePanel(safePanels, probabilities);
  }
  const protection = prioritizeLevelProtection({
    level: boardData.level,
    panels: boardData.panels,
    probabilities,
    safePanels,
    suggestedPanel,
    capped
  });
  suggestedPanel = protection.suggestedPanel;

  const suggestedIsSafe = safePanels.some(pos => samePosition(pos, suggestedPanel));
  const clearOptimalityProven = !capped && Boolean(
    progress.moveProven ||
    progress.isExact ||
    suggestedIsSafe
  );
  const optimalityProven = clearOptimalityProven && !protection.overridesClear;

  return {
    goal: "clear",
    suggestedPanel,
    winProbability: progress.winProbability,
    winProbabilityUpper: progress.winProbabilityUpper,
    probabilities,
    safePanels,
    compatibleCount,
    capped,
    computeTime: performance.now() - startTime,
    depth: progress.depth ?? 0,
    isExact: Boolean(progress.isExact),
    moveProven: Boolean(progress.moveProven),
    optimalityProven,
    boundsRigorous: true,
    engine,
    levelProtection: protection,
    reason: protection.prioritizing
      ? (
        protection.suggestedRisk < 1e-12
          ? "Guaranteed-safe level-protection move"
          : "Lowest-risk level-protection move"
      )
      : optimalityProven
      ? (
        suggestedIsSafe
          ? "Guaranteed-safe move proven optimal"
          : "Optimal move proven"
      )
      : (progress.reason || `Depth ${progress.depth ?? 0}`)
  };
}

function protectFallbackResult(result, boardData) {
  const protection = prioritizeLevelProtection({
    level: boardData.level,
    panels: boardData.panels,
    probabilities: result.probabilities,
    safePanels: result.safePanels ?? [],
    suggestedPanel: result.suggestedPanel,
    capped: result.capped
  });
  const suggestedIsSafe = (result.safePanels ?? []).some(
    pos => samePosition(pos, protection.suggestedPanel)
  );

  return {
    ...result,
    suggestedPanel: protection.suggestedPanel,
    levelProtection: protection,
    optimalityProven: !result.capped && Boolean(
      result.isExact ||
      suggestedIsSafe
    ) && !protection.overridesClear,
    reason: protection.prioritizing
      ? (
        protection.suggestedRisk < 1e-12
          ? "Guaranteed-safe level-protection move"
          : "Lowest-risk level-protection move"
      )
      : result.reason
  };
}

function emptyResult(startTime, engine) {
  return {
    goal: "clear",
    suggestedPanel: null,
    winProbability: 0,
    winProbabilityUpper: 0,
    probabilities: { panels: [], typeProbs: [], totalCompatible: 0 },
    safePanels: [],
    compatibleCount: 0,
    capped: false,
    computeTime: performance.now() - startTime,
    depth: 0,
    isExact: true,
    optimalityProven: false,
    engine,
    reason: "No compatible boards"
  };
}

function solveClearJS(board, boardData, token, options, fallbackReason = "") {
  cancelCurrent = solveProgressive(
    board,
    result => {
      const fallbackResult = protectFallbackResult({
        ...result,
        goal: "clear",
        engine: "JavaScript fallback",
        boundsRigorous: false,
        optimalityProven: !result.capped && Boolean(
          result.isExact ||
          result.safePanels?.some(pos => samePosition(pos, result.suggestedPanel))
        ),
        fallbackReason
      }, boardData);
      self.postMessage({ type: "progress", token, result: fallbackResult });
    },
    result => {
      const fallbackResult = protectFallbackResult({
        ...result,
        goal: "clear",
        engine: "JavaScript fallback",
        boundsRigorous: false,
        optimalityProven: !result.capped && Boolean(
          result.isExact ||
          result.safePanels?.some(pos => samePosition(pos, result.suggestedPanel))
        ),
        fallbackReason
      }, boardData);
      self.postMessage({ type: "complete", token, result: fallbackResult });
    },
    options.maxBoards,
    { timeout: options.timeout }
  );
}

async function solveClearWasm(board, boardData, token, options) {
  const startTime = performance.now();
  const module = await loadWasm();

  // Keep probability enumeration in our corrected JS model. The WASM engine
  // performs the deep tree search; JS supplies the deduplicated Bayesian UI
  // probabilities and proof gate.
  const compatibleBoards = generateCompatibleBoards(board, options.maxBoards);
  const capped = compatibleBoards.length >= options.maxBoards;
  if (compatibleBoards.length === 0) {
    self.postMessage({
      type: "complete",
      token,
      result: emptyResult(startTime, "WASM")
    });
    return;
  }

  const probabilities = calculateProbabilities(board, compatibleBoards);
  const safePanels = findSafePanels(board, compatibleBoards);
  const panels = boardData.panels.flat();
  const rowSums = boardData.rowHints.map(hint => hint.sum);
  const rowVoltorbs = boardData.rowHints.map(hint => hint.voltorbCount);
  const colSums = boardData.colHints.map(hint => hint.sum);
  const colVoltorbs = boardData.colHints.map(hint => hint.voltorbCount);

  const postProgress = progress => {
    self.postMessage({
      type: "progress",
      token,
      result: buildClearResult(
        progress,
        probabilities,
        safePanels,
        compatibleBoards.length,
        capped,
        startTime,
        "Exact WASM",
        boardData
      )
    });
  };

  const wasmResult = typeof module.solveBoardWithProgress === "function"
    ? module.solveBoardWithProgress(
      boardData.level,
      panels,
      rowSums,
      rowVoltorbs,
      colSums,
      colVoltorbs,
      options.timeout,
      options.maxBoards,
      postProgress
    )
    : module.solveBoard(
      boardData.level,
      panels,
      rowSums,
      rowVoltorbs,
      colSums,
      colVoltorbs,
      options.timeout,
      options.maxBoards
    );

  const finalResult = buildClearResult(
    {
      bestPanel: wasmResult.suggestedPanel,
      winProbability: wasmResult.winProbability,
      winProbabilityUpper: wasmResult.winProbabilityUpper,
      depth: wasmResult.depth,
      isExact: wasmResult.isExact,
      moveProven: wasmResult.moveProven,
      reason: wasmResult.reason
    },
    probabilities,
    safePanels,
    compatibleBoards.length,
    capped || Boolean(wasmResult.capped),
    startTime,
    "Exact WASM",
    boardData
  );
  self.postMessage({ type: "complete", token, result: finalResult });
}

function solveCoins(board, token, options) {
  cancelCurrent = solveCoinProgressive(
    board,
    result => self.postMessage({ type: "progress", token, result }),
    result => self.postMessage({ type: "complete", token, result }),
    options.maxBoards,
    { timeout: options.timeout }
  );
}

self.addEventListener("message", async event => {
  if (event.data.type === "preload") {
    try {
      await loadWasm();
      self.postMessage({ type: "wasm-ready" });
    } catch (error) {
      self.postMessage({
        type: "wasm-unavailable",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  if (event.data.type !== "solve") return;

  cancelCurrent?.();
  cancelCurrent = null;

  const { token, options, goal = "clear" } = event.data;
  const board = hydrateBoard(event.data.board);

  try {
    if (goal === "coins") {
      solveCoins(board, token, options);
      return;
    }

    try {
      await solveClearWasm(board, event.data.board, token, options);
    } catch (wasmError) {
      solveClearJS(
        board,
        event.data.board,
        token,
        options,
        wasmError instanceof Error ? wasmError.message : String(wasmError)
      );
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      token,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
