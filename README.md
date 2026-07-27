# Voltwise

Voltwise is a browser-based assistant for the Voltorb Flip minigame. It is
designed around a simple promise: never label a move “safe” unless it is safe
across every compatible board the solver considered.

Compared with the calculator at voltorbflip.com, this version adds:

- level-aware board generation for Levels 1–8;
- Bayesian weighting across the game’s ten board types per level;
- per-panel Voltorb, 1, 2, and 3 probabilities;
- multi-step search aimed at whole-board clear probability;
- visible warnings when the clues force a gamble;
- undo, input validation, keyboard-friendly clue entry, and a responsive UI;
- a Web Worker so deeper analysis does not freeze the interface.

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

## Solver note

The JavaScript solver core is derived from Giovanni Maria Tomaselli’s
MIT-licensed `GimmyTomas/voltorb-flip` project. See
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
