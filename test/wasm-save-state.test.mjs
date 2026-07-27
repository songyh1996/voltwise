import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import createModule from "../docs/js/solver-wasm.js";

test("the exact WASM solver treats mapped Voltorbs as evidence", async () => {
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
    1, 1, 0, -1, 1,
    0, 1, 1, 1, 1,
    1, 3, 1, 0, 1,
    1, 0, 2, 1, 0,
    2, 1, 1, 0, 1
  ];

  const result = module.solveBoard(
    1,
    panels,
    [5, 4, 6, 4, 5],
    [1, 1, 1, 2, 1],
    [5, 6, 5, 4, 4],
    [1, 1, 1, 2, 1],
    1000,
    100
  );

  assert.equal(result.compatibleCount, 1);
  assert.deepEqual(result.suggestedPanel, { row: 0, col: 3 });
  assert.equal(result.winProbability, 1);
  assert.equal(result.reason, "Guaranteed-safe move proven optimal");
});
