import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import createModule from "../docs/js/solver-wasm.js";

test("the certified solver chooses the safest move among clear-optimal ties", async () => {
  const wasmBinary = await readFile(
    new URL("../docs/js/voltorb_wasm.wasm", import.meta.url)
  );
  const module = await createModule({
    instantiateWasm(imports, receiveInstance) {
      WebAssembly.instantiate(wasmBinary, imports).then(
        result => receiveInstance(result.instance)
      );
      return {};
    }
  });

  const panels = [
    1, -1, -1, -1, -1,
    2, -1, -1, -1, -1,
    2, 3, -1, -1, -1,
    2, -1, -1, -1, -1,
    1, 3, 3, -1, -1
  ];

  const result = module.solveBoard(
    8,
    panels,
    [4, 5, 7, 3, 9],
    [2, 2, 2, 3, 1],
    [8, 8, 6, 2, 4],
    [0, 1, 2, 4, 3],
    1000,
    500000
  );

  assert.equal(result.compatibleCount, 21);
  assert.deepEqual(result.suggestedPanel, { row: 4, col: 4 });
  assert.equal(result.moveProven, true);
  assert.equal(result.winProbability, 3 / 21);
  assert.match(result.reason, /optimal value and move proven/);
});
