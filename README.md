# Voltwise

Voltwise is a browser-based assistant for the Voltorb Flip minigame. It is
designed around a simple promise: never label a move “safe” unless it is safe
across every compatible board the solver considered.

Compared with the calculator at voltorbflip.com, this version adds:

- level-aware board generation for Levels 1–8;
- Bayesian weighting across the game’s ten board types per level;
- per-panel Voltorb, 1, 2, and 3 probabilities;
- continuous clue entry that auto-advances after each number and resolves
  level-valid double-digit totals without an extra keypress;
- one-click hover choices for recording a revealed 1, 2, 3, or Voltorb, with
  impossible outcomes disabled after analysis;
- save-state mode that keeps discovered Voltorbs on the board as exact evidence
  and immediately recalculates instead of ending the round;
- a 60-second exact-mass WebAssembly belief-state search aimed at whole-board
  clear probability, with a JavaScript fallback;
- level-retention awareness that reveals every guaranteed-safe numbered card,
  including known-safe 1s, before recommending a gamble until the current
  level is protected;
- exact integer Bayesian board weights and collision-free memo keys, so
  heuristic estimates may order work but never prune or certify it;
- per-action proof bounds: “optimal move proven” appears as soon as one move's
  exact lower bound meets every rival upper bound (or a panel is guaranteed
  safe);
- an optional Coins goal that compares continuing with banking the current
  payout and can recommend quitting;
- visible warnings when the clues force a gamble;
- automatic board reset after wins and losses, with next-level progression
  after a win and reveal-count-based demotion after a loss;
- constraint-aware reveal entry that disables impossible values while keeping
  every recorded tile editable;
- undo, input validation, rapid keyboard clue entry, and a responsive UI;
- a replaceable Web Worker so a new board state immediately cancels stale
  deep work.

## Run locally

```powershell
npm run dev
```

Then open <http://127.0.0.1:4173>.

## Test

```powershell
npm test
```

The app has no runtime dependencies and sends no board data to a server.

## Rebuild the WASM engine

The checked-in browser assets are reproducibly built from the upstream commit
pinned in `scripts/build-wasm.sh`. With an Emscripten SDK installed:

```bash
EMSDK=/path/to/emsdk bash scripts/build-wasm.sh
```

The local WASM sources deduplicate compatible physical boards, assign each one
an exact integer mass derived from the game's board-type rejection sampler, and
use those masses for rigorous branch-and-bound certification.

## Solver note

The JavaScript and WebAssembly solver cores are derived from Giovanni Maria
Tomaselli’s MIT-licensed `GimmyTomas/voltorb-flip` project. See
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
