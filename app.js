import { Board } from "./docs/js/board.js";
import {
  BOARD_TYPES,
  PanelValue,
  getTotalSum
} from "./docs/js/boardTypes.js";

const SIZE = 5;
const UNKNOWN = PanelValue.Unknown;
const EMPTY_HINT = () => ({ sum: null, voltorbCount: null });
const EMPTY_PANELS = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(UNKNOWN));
const EMPTY_HINTS = () => Array.from({ length: SIZE }, EMPTY_HINT);

const DEMO = {
  level: 1,
  rowHints: [
    { sum: 5, voltorbCount: 1 },
    { sum: 4, voltorbCount: 1 },
    { sum: 6, voltorbCount: 1 },
    { sum: 4, voltorbCount: 2 },
    { sum: 5, voltorbCount: 1 }
  ],
  colHints: [
    { sum: 5, voltorbCount: 1 },
    { sum: 6, voltorbCount: 1 },
    { sum: 5, voltorbCount: 1 },
    { sum: 4, voltorbCount: 2 },
    { sum: 4, voltorbCount: 1 }
  ]
};

const SEARCH_OPTIONS = {
  quick: { timeout: 3000, maxBoards: 150000 },
  balanced: { timeout: 8000, maxBoards: 350000 },
  deep: { timeout: 20000, maxBoards: 500000 }
};

const els = {
  boardMount: document.querySelector("#board-mount"),
  boardStatus: document.querySelector("#board-status"),
  level: document.querySelector("#level-select"),
  demo: document.querySelector("#demo-button"),
  undo: document.querySelector("#undo-button"),
  reset: document.querySelector("#reset-button"),
  analyze: document.querySelector("#analyze-button"),
  searchMode: document.querySelector("#search-mode"),
  quality: document.querySelector("#analysis-quality"),
  empty: document.querySelector("#recommendation-empty"),
  result: document.querySelector("#recommendation-result"),
  analysisMessage: document.querySelector("#analysis-message"),
  riskRing: document.querySelector("#risk-ring"),
  riskValue: document.querySelector("#risk-value"),
  moveKicker: document.querySelector("#move-kicker"),
  moveCoordinate: document.querySelector("#move-coordinate"),
  moveDescription: document.querySelector("#move-description"),
  statBoards: document.querySelector("#stat-boards"),
  statWin: document.querySelector("#stat-win"),
  statDepth: document.querySelector("#stat-depth"),
  statTime: document.querySelector("#stat-time"),
  dialog: document.querySelector("#reveal-dialog"),
  dialogCoordinate: document.querySelector("#dialog-coordinate")
};

let state = freshState();
let history = [];
let lastResult = null;
let targetPanel = null;
let requestToken = 0;
let solving = false;

const solverWorker = new Worker("./solver-worker.js", { type: "module" });

function freshState() {
  return {
    level: 1,
    rowHints: EMPTY_HINTS(),
    colHints: EMPTY_HINTS(),
    panels: EMPTY_PANELS()
  };
}

function clonePanels(panels) {
  return panels.map(row => [...row]);
}

function makeBoard() {
  const board = new Board(state.level);
  for (let index = 0; index < SIZE; index++) {
    board.setRowHint(index, state.rowHints[index]);
    board.setColHint(index, state.colHints[index]);
    for (let col = 0; col < SIZE; col++) {
      board.set(index, col, state.panels[index][col]);
    }
  }
  return board;
}

function panelProbability(row, col) {
  return lastResult?.probabilities?.panels?.find(
    panel => panel.pos.row === row && panel.pos.col === col
  ) ?? null;
}

function recommendedAt(row, col) {
  const suggested = lastResult?.suggestedPanel;
  return suggested?.row === row && suggested?.col === col;
}

function formatPercent(value, precise = false) {
  if (!Number.isFinite(value)) return "—";
  const percentage = value * 100;
  if (percentage === 0 || percentage === 100) return `${percentage.toFixed(0)}%`;
  if (precise || percentage < 10) return `${percentage.toFixed(1)}%`;
  return `${percentage.toFixed(0)}%`;
}

function riskClass(risk) {
  if (risk === 0) return "safe";
  if (risk < 0.25) return "risk-low";
  if (risk <= 0.5) return "risk-medium";
  return "risk-high";
}

function riskColor(risk) {
  if (risk === 0) return "var(--safe)";
  if (risk < 0.25) return "var(--lime)";
  if (risk <= 0.5) return "var(--orange)";
  return "var(--red)";
}

function coordinate(row, col) {
  return `R${row + 1} C${col + 1}`;
}

function createTile(row, col) {
  const value = state.panels[row][col];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile";
  // Panels are mouse/touch actions, not part of the rapid clue-entry tab loop.
  button.tabIndex = -1;
  button.style.gridRow = String(row + 1);
  button.style.gridColumn = String(col + 1);

  if (value !== UNKNOWN) {
    button.classList.add("revealed", `value-${value}`);
    button.setAttribute("aria-label", `${coordinate(row, col)} revealed as ${value === 0 ? "Voltorb" : value}`);
    button.disabled = true;
    if (value === 0) {
      button.innerHTML = '<span class="revealed-orb" aria-hidden="true"><i></i></span>';
    } else {
      button.innerHTML = `<span class="revealed-value">${value}</span>`;
    }
    return button;
  }

  const probability = panelProbability(row, col);
  button.setAttribute("aria-label", `${coordinate(row, col)}, hidden panel`);
  button.addEventListener("click", () => openRevealDialog(row, col));

  if (!probability) {
    button.innerHTML = '<span class="risk-copy"><strong>HIDDEN</strong><small>tap after reveal</small></span>';
    return button;
  }

  const risk = probability.pVoltorb;
  const multiplierChance = probability.pTwo + probability.pThree;
  button.classList.add(riskClass(risk));
  if (risk === 0) button.classList.add("safe");
  if (multiplierChance < 1e-10) button.classList.add("junk");
  if (recommendedAt(row, col)) button.classList.add("recommended");
  button.style.setProperty("--risk", String(risk));
  button.style.setProperty("--risk-color", riskColor(risk));
  button.setAttribute(
    "aria-label",
    `${coordinate(row, col)}, ${formatPercent(risk, true)} Voltorb risk, ` +
    `${formatPercent(probability.pTwo)} chance of 2, ${formatPercent(probability.pThree)} chance of 3` +
    (recommendedAt(row, col) ? ", recommended move" : "")
  );

  const secondary = multiplierChance < 1e-10
    ? "skip · no multiplier"
    : `2 ${formatPercent(probability.pTwo)} · 3 ${formatPercent(probability.pThree)}`;

  button.innerHTML = `
    ${recommendedAt(row, col) ? '<span class="tile-recommend" aria-hidden="true">★</span>' : ""}
    <span class="risk-copy">
      <strong>V ${formatPercent(risk, true)}</strong>
      <span class="risk-bar" aria-hidden="true"><i></i></span>
      <small>${secondary}</small>
    </span>
  `;
  return button;
}

function createHintCard(kind, index) {
  const isRow = kind === "row";
  const hint = isRow ? state.rowHints[index] : state.colHints[index];
  const card = document.createElement("div");
  card.className = "hint-card";
  card.dataset.hintKind = kind;
  card.dataset.hintIndex = String(index);
  card.style.gridRow = isRow ? String(index + 1) : "6";
  card.style.gridColumn = isRow ? "6" : String(index + 1);

  const direction = isRow ? `Row ${index + 1}` : `Column ${index + 1}`;
  card.innerHTML = `
    <label class="hint-field">
      <span aria-hidden="true">Σ</span>
      <input
        type="number"
        min="0"
        max="15"
        inputmode="numeric"
        aria-label="${direction} point total"
        data-field="sum"
        value="${hint.sum ?? ""}">
    </label>
    <label class="hint-field voltorb">
      <span aria-hidden="true">V</span>
      <input
        type="number"
        min="0"
        max="5"
        inputmode="numeric"
        aria-label="${direction} Voltorb count"
        data-field="voltorbCount"
        value="${hint.voltorbCount ?? ""}">
    </label>
  `;

  for (const input of card.querySelectorAll("input")) {
    input.addEventListener("input", event => updateHint(kind, index, event.target.dataset.field, event.target.value));
    input.addEventListener("keydown", event => {
      if (event.key === "Tab") {
        event.preventDefault();
        focusAdjacentHint(input, event.shiftKey ? -1 : 1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        focusNextHint(input);
      }
    });
  }

  return card;
}

function focusAdjacentHint(current, offset) {
  const inputs = [...els.boardMount.querySelectorAll(".hint-card input")];
  const index = inputs.indexOf(current);
  if (index < 0 || inputs.length === 0) return;

  const nextIndex = (index + offset + inputs.length) % inputs.length;
  inputs[nextIndex].focus();
  inputs[nextIndex].select();
}

function renderBoard() {
  const grid = document.createElement("div");
  grid.className = "board-grid";
  grid.setAttribute("aria-label", "Five by five Voltorb Flip board with row and column clues");

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      grid.append(createTile(row, col));
    }
    grid.append(createHintCard("row", row));
  }
  for (let col = 0; col < SIZE; col++) {
    grid.append(createHintCard("col", col));
  }

  const corner = document.createElement("div");
  corner.className = "corner-key";
  corner.style.gridRow = "6";
  corner.style.gridColumn = "6";
  corner.innerHTML = "Σ SUM<br>● VOLT";
  grid.append(corner);

  els.boardMount.replaceChildren(grid);
  markInvalidHints();
}

function focusNextHint(current) {
  const inputs = [...els.boardMount.querySelectorAll(".hint-card input")];
  const index = inputs.indexOf(current);
  if (index >= 0 && inputs[index + 1]) {
    inputs[index + 1].focus();
    inputs[index + 1].select();
  } else {
    els.analyze.focus();
  }
}

function updateHint(kind, index, field, rawValue) {
  const value = rawValue === "" ? null : Number(rawValue);
  const hints = kind === "row" ? state.rowHints : state.colHints;
  hints[index][field] = Number.isFinite(value) ? value : null;
  invalidateAnalysis("Clues changed. Run the analysis again.");
  markInvalidHints();
  updateBoardStatus();
}

function validateLine(hint, values = null) {
  if (!Number.isInteger(hint.sum) || !Number.isInteger(hint.voltorbCount)) {
    return "Both numbers are required.";
  }
  if (hint.sum < 0 || hint.sum > 15 || hint.voltorbCount < 0 || hint.voltorbCount > 5) {
    return "A clue is outside the allowed range.";
  }

  const nonVoltorbs = SIZE - hint.voltorbCount;
  if (hint.sum < nonVoltorbs || hint.sum > nonVoltorbs * 3) {
    return "That clue cannot fit in five panels.";
  }

  if (!values) return null;

  let knownSum = 0;
  let knownVoltorbs = 0;
  let unknown = 0;
  for (const value of values) {
    if (value === UNKNOWN) unknown++;
    else if (value === PanelValue.Voltorb) knownVoltorbs++;
    else knownSum += value;
  }

  const remainingVoltorbs = hint.voltorbCount - knownVoltorbs;
  const remainingNonVoltorbs = unknown - remainingVoltorbs;
  const remainingSum = hint.sum - knownSum;

  if (
    remainingVoltorbs < 0 ||
    remainingNonVoltorbs < 0 ||
    remainingSum < remainingNonVoltorbs ||
    remainingSum > remainingNonVoltorbs * 3
  ) {
    return "Revealed panels conflict with this clue.";
  }
  return null;
}

function validateState() {
  for (let row = 0; row < SIZE; row++) {
    const issue = validateLine(state.rowHints[row], state.panels[row]);
    if (issue) return { ok: false, message: `Row ${row + 1}: ${issue}`, kind: "row", index: row };
  }
  for (let col = 0; col < SIZE; col++) {
    const values = state.panels.map(row => row[col]);
    const issue = validateLine(state.colHints[col], values);
    if (issue) return { ok: false, message: `Column ${col + 1}: ${issue}`, kind: "col", index: col };
  }

  const rowSum = state.rowHints.reduce((sum, hint) => sum + hint.sum, 0);
  const colSum = state.colHints.reduce((sum, hint) => sum + hint.sum, 0);
  const rowVoltorbs = state.rowHints.reduce((sum, hint) => sum + hint.voltorbCount, 0);
  const colVoltorbs = state.colHints.reduce((sum, hint) => sum + hint.voltorbCount, 0);

  if (rowSum !== colSum) {
    return { ok: false, message: `Row points total ${rowSum}, but column points total ${colSum}. Recheck one clue.` };
  }
  if (rowVoltorbs !== colVoltorbs) {
    return { ok: false, message: `Rows show ${rowVoltorbs} Voltorbs, but columns show ${colVoltorbs}. Recheck one clue.` };
  }

  const levelMatches = BOARD_TYPES[state.level - 1].some(
    type => type.n0 === rowVoltorbs && getTotalSum(type) === rowSum
  );
  if (!levelMatches) {
    return {
      ok: false,
      message: `These totals do not occur on Level ${state.level}. Check the selected level and clues.`
    };
  }

  if (state.panels.some(row => row.includes(PanelValue.Voltorb))) {
    return {
      ok: false,
      message: "That reveal was a Voltorb, so this round is over. Undo if it was entered by mistake.",
      lost: true
    };
  }

  return { ok: true, board: makeBoard() };
}

function markInvalidHints() {
  for (const card of els.boardMount.querySelectorAll(".hint-card")) {
    const kind = card.dataset.hintKind;
    const index = Number(card.dataset.hintIndex);
    const hint = kind === "row" ? state.rowHints[index] : state.colHints[index];
    const values = kind === "row"
      ? state.panels[index]
      : state.panels.map(row => row[index]);
    const untouched = hint.sum === null && hint.voltorbCount === null;
    card.classList.toggle("invalid", !untouched && Boolean(validateLine(hint, values)));
  }
}

function updateBoardStatus() {
  const completedFields = [...state.rowHints, ...state.colHints]
    .reduce(
      (count, hint) =>
        count + Number(Number.isInteger(hint.sum)) + Number(Number.isInteger(hint.voltorbCount)),
      0
    );
  if (completedFields < 20) {
    els.boardStatus.classList.remove("error");
    els.boardStatus.textContent = completedFields === 0
      ? "Add all ten line clues to unlock analysis."
      : `${completedFields} of 20 clue numbers entered.`;
    return;
  }

  const validation = validateState();
  els.boardStatus.classList.toggle("error", !validation.ok);
  if (validation.ok) {
    const revealed = state.panels.flat().filter(value => value !== UNKNOWN).length;
    els.boardStatus.textContent = revealed
      ? `${revealed} panel${revealed === 1 ? "" : "s"} recorded. Ready to update the model.`
      : "All clues are valid. Ready to analyze.";
  } else {
    els.boardStatus.textContent = validation.message;
  }
}

function openRevealDialog(row, col) {
  targetPanel = { row, col };
  els.dialogCoordinate.textContent = `What was at ${coordinate(row, col)}?`;
  els.dialog.showModal();
}

function recordReveal(value) {
  if (!targetPanel) return;
  history.push(clonePanels(state.panels));
  state.panels[targetPanel.row][targetPanel.col] = value;
  targetPanel = null;
  lastResult = null;
  renderBoard();
  renderAnalysis();
  updateBoardStatus();
  els.undo.disabled = history.length === 0;

  const validation = validateState();
  if (validation.ok) {
    analyzeBoard();
  } else if (validation.lost) {
    setAnalysisMessage(validation.message, "error");
    els.quality.textContent = "ROUND LOST";
    els.quality.className = "quality-badge risky";
  }
}

function resetBoard() {
  requestToken++;
  solving = false;
  state = freshState();
  history = [];
  lastResult = null;
  els.level.value = "1";
  els.undo.disabled = true;
  renderBoard();
  renderAnalysis();
  updateBoardStatus();
}

function loadDemo() {
  requestToken++;
  solving = false;
  state = {
    level: DEMO.level,
    rowHints: DEMO.rowHints.map(hint => ({ ...hint })),
    colHints: DEMO.colHints.map(hint => ({ ...hint })),
    panels: EMPTY_PANELS()
  };
  history = [];
  lastResult = null;
  els.level.value = String(state.level);
  els.undo.disabled = true;
  renderBoard();
  renderAnalysis();
  updateBoardStatus();
  analyzeBoard();
}

function undoReveal() {
  if (!history.length) return;
  requestToken++;
  solving = false;
  state.panels = history.pop();
  lastResult = null;
  els.undo.disabled = history.length === 0;
  renderBoard();
  renderAnalysis();
  updateBoardStatus();
  if (validateState().ok) analyzeBoard();
}

function invalidateAnalysis(message) {
  requestToken++;
  solving = false;
  lastResult = null;
  renderAnalysis();
  if (message) setAnalysisMessage(message);
}

function serializeBoard(board) {
  return {
    level: board.level,
    rowHints: board.rowHints.map(hint => ({ ...hint })),
    colHints: board.colHints.map(hint => ({ ...hint })),
    panels: board.panels.map(row => [...row])
  };
}

function analyzeBoard() {
  const validation = validateState();
  if (!validation.ok) {
    setAnalysisMessage(validation.message, "error");
    updateBoardStatus();
    markInvalidHints();
    return;
  }

  const token = ++requestToken;
  const options = SEARCH_OPTIONS[els.searchMode.value] ?? SEARCH_OPTIONS.balanced;
  solving = true;
  lastResult = null;
  renderAnalysis();
  els.boardStatus.classList.remove("error");
  els.boardStatus.textContent = "Enumerating level-valid boards and searching future reveals…";

  solverWorker.postMessage({
    type: "solve",
    token,
    board: serializeBoard(validation.board),
    options
  });
}

function applySolverResult(result, isComplete) {
  lastResult = result;
  solving = !isComplete;
  renderBoard();
  renderAnalysis();

  if (result.compatibleCount === 0) {
    els.boardStatus.classList.add("error");
    els.boardStatus.textContent = "No real board matches these clues and reveals. Recheck the last entry.";
  } else if (result.capped) {
    els.boardStatus.classList.remove("error");
    els.boardStatus.textContent = `Analyzed a ${result.compatibleCount.toLocaleString()}-board cap. Risk values are approximate for this unusually broad state.`;
  } else if (isComplete) {
    els.boardStatus.classList.remove("error");
    els.boardStatus.textContent = `Analysis complete across ${result.compatibleCount.toLocaleString()} compatible physical boards.`;
  } else {
    els.boardStatus.classList.remove("error");
    els.boardStatus.textContent = `Search depth ${result.depth} complete; refining the whole-board strategy…`;
  }
}

function renderAnalysis() {
  els.analyze.disabled = solving;
  els.analyze.classList.toggle("solving", solving);
  els.analyze.querySelector(".button-label").textContent = solving ? "Analyzing" : "Analyze board";

  if (!lastResult) {
    els.empty.hidden = false;
    els.result.hidden = true;
    els.quality.textContent = solving ? "SEARCHING" : "WAITING";
    els.quality.className = "quality-badge neutral";
    els.statBoards.textContent = "—";
    els.statWin.textContent = "—";
    els.statDepth.textContent = "—";
    els.statTime.textContent = "—";
    if (solving) {
      setAnalysisMessage("Building the exact set of boards allowed by this level and your clues…");
    } else if (!els.analysisMessage.classList.contains("error")) {
      setAnalysisMessage("The model will clearly separate safe moves from unavoidable guesses.");
    }
    return;
  }

  els.statBoards.textContent = lastResult.compatibleCount?.toLocaleString() ?? "0";
  els.statWin.textContent = formatWinRange(lastResult);
  els.statDepth.textContent = lastResult.isExact ? "Exact" : `Depth ${lastResult.depth ?? 0}`;
  els.statTime.textContent = lastResult.computeTime >= 1000
    ? `${(lastResult.computeTime / 1000).toFixed(1)}s`
    : `${Math.round(lastResult.computeTime)}ms`;

  if (!lastResult.suggestedPanel) {
    els.empty.hidden = false;
    els.result.hidden = true;
    const noBoards = lastResult.compatibleCount === 0;
    els.empty.querySelector("h2").textContent = noBoards ? "No matching board." : "All multipliers accounted for.";
    els.empty.querySelector("p").textContent = noBoards
      ? "One or more clues or reveals conflict. Recheck the highlighted entries."
      : "You have enough information to finish this board without another risky recommendation.";
    els.quality.textContent = noBoards ? "CHECK INPUT" : "CLEAR";
    els.quality.className = `quality-badge ${noBoards ? "risky" : "safe"}`;
    setAnalysisMessage(
      noBoards
        ? "The model found zero legal boards for this level and evidence."
        : "All remaining hidden panels are irrelevant to winning; do not flip them.",
      noBoards ? "error" : ""
    );
    return;
  }

  const move = lastResult.suggestedPanel;
  const probability = panelProbability(move.row, move.col);
  const risk = probability?.pVoltorb ?? 0;
  const exact = Boolean(lastResult.isExact && !lastResult.capped);
  const safe = risk < 1e-12;

  els.empty.hidden = true;
  els.result.hidden = false;
  els.riskValue.textContent = formatPercent(risk, true);
  els.riskRing.style.setProperty("--risk-angle", `${Math.max(risk * 360, safe ? 360 : 2)}deg`);
  els.riskRing.style.setProperty("--ring-color", riskColor(risk));
  els.moveCoordinate.textContent = coordinate(move.row, move.col);
  els.moveKicker.textContent = safe ? "GUARANTEED SAFE" : "BEST AVAILABLE MOVE";
  els.moveKicker.style.color = safe ? "var(--safe)" : riskColor(risk);
  els.moveDescription.textContent = safe
    ? "This panel is never a Voltorb in any compatible board. Reveal it, then record the value."
    : `Modeled outcomes: 1 ${formatPercent(probability.pOne)}, 2 ${formatPercent(probability.pTwo)}, 3 ${formatPercent(probability.pThree)}.`;

  if (safe) {
    els.quality.textContent = exact ? "PROVEN SAFE" : "SAFE";
    els.quality.className = "quality-badge safe";
    setAnalysisMessage(
      lastResult.capped
        ? "No Voltorb appeared in the analyzed board sample, but the board cap prevents a mathematical guarantee."
        : "Safe means 0% across every compatible board—not merely the lowest risk on the grid."
    );
  } else {
    els.quality.textContent = exact ? "EXACT GAMBLE" : "GAMBLE";
    els.quality.className = "quality-badge risky";
    setAnalysisMessage(
      `This move can still lose. It is recommended because it gives the best modeled chance of eventually clearing the board (${formatWinRange(lastResult)}).`,
      "warning"
    );
  }
}

function formatWinRange(result) {
  const lower = result.winProbability;
  const upper = result.winProbabilityUpper;
  if (!Number.isFinite(lower)) return "—";
  if (
    !result.isExact &&
    Number.isFinite(upper) &&
    Math.abs(upper - lower) >= 0.005
  ) {
    return `${formatPercent(lower)}–${formatPercent(upper)}`;
  }
  return formatPercent(lower);
}

function setAnalysisMessage(message, tone = "") {
  els.analysisMessage.textContent = message;
  els.analysisMessage.className = `analysis-message${tone ? ` ${tone}` : ""}`;
}

solverWorker.addEventListener("message", event => {
  const { type, token, result, error } = event.data;
  if (token !== requestToken) return;

  if (type === "progress") {
    applySolverResult(result, false);
  } else if (type === "complete") {
    applySolverResult(result, true);
  } else if (type === "error") {
    solving = false;
    renderAnalysis();
    setAnalysisMessage(error || "The solver hit an unexpected error.", "error");
    els.boardStatus.classList.add("error");
    els.boardStatus.textContent = "Analysis failed. Your board entries are still intact.";
  }
});

els.level.addEventListener("change", () => {
  state.level = Number(els.level.value);
  history = [];
  els.undo.disabled = true;
  invalidateAnalysis("Level changed. Confirm the clues, then analyze again.");
  updateBoardStatus();
});

els.searchMode.addEventListener("change", () => {
  if (validateState().ok && lastResult) analyzeBoard();
});

els.demo.addEventListener("click", loadDemo);
els.undo.addEventListener("click", undoReveal);
els.reset.addEventListener("click", resetBoard);
els.analyze.addEventListener("click", analyzeBoard);

for (const choice of document.querySelectorAll(".reveal-choice")) {
  choice.addEventListener("click", () => recordReveal(Number(choice.dataset.value)));
}

els.dialog.addEventListener("click", event => {
  if (event.target === els.dialog) els.dialog.close();
});

renderBoard();
renderAnalysis();
updateBoardStatus();
