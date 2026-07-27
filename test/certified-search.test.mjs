import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { N_ACCEPTED } from "../docs/js/boardTypes.js";

const gcd = (left, right) => right === 0n ? left : gcd(right, left % right);

function lcm(values) {
  return values.reduce(
    (value, item) => value / gcd(value, item) * item,
    1n
  );
}

function parseExactWeights(source) {
  const entries = [...source.matchAll(
    /\{\{\{(0x[0-9a-f]+|\d+)(?:ULL)?,\s*(0x[0-9a-f]+|\d+)(?:ULL)?,\s*(0x[0-9a-f]+|\d+)(?:ULL)?,\s*(0x[0-9a-f]+|\d+)(?:ULL)?\}\}\}/gi
  )];

  return entries.map(match =>
    BigInt(match[1]) +
    (BigInt(match[2]) << 64n) +
    (BigInt(match[3]) << 128n) +
    (BigInt(match[4]) << 192n)
  );
}

test("the WASM exact-mass table matches every accepted-board denominator", async () => {
  const source = await readFile(
    new URL("../wasm/certified_solver.cpp", import.meta.url),
    "utf8"
  );
  const weights = parseExactWeights(source);

  assert.equal(weights.length, 80);

  for (let level = 0; level < N_ACCEPTED.length; level++) {
    const denominator = lcm(N_ACCEPTED[level]);
    for (let type = 0; type < N_ACCEPTED[level].length; type++) {
      assert.equal(
        weights[level * 10 + type],
        denominator / N_ACCEPTED[level][type],
        `level ${level + 1}, type ${type}`
      );
    }
  }
});

test("exact success mass values information, not only immediate safety", () => {
  // Four equally weighted hidden worlds over panels A, B, C. C is safest
  // immediately (3/4 survival) but can win only one world. B survives only
  // 2/4 yet its outcome branches win two worlds. Exact belief search must
  // evaluate the adaptive policy rather than rank only P(not bomb).
  const worlds = [
    { panels: [0, 0, 2], weight: 1n },
    { panels: [0, 1, 2], weight: 1n },
    { panels: [0, 2, 0], weight: 1n },
    { panels: [2, 0, 2], weight: 1n }
  ];

  const key = (indices, revealed) =>
    `${indices.join(",")}|${[...revealed].sort().join(",")}`;
  const memo = new Map();

  function won(indices, revealed) {
    return indices.every(index =>
      worlds[index].panels.every(
        (value, panel) => value < 2 || revealed.has(panel)
      )
    );
  }

  function value(indices, revealed) {
    if (won(indices, revealed)) {
      return indices.reduce((sum, index) => sum + worlds[index].weight, 0n);
    }
    const stateKey = key(indices, revealed);
    if (memo.has(stateKey)) return memo.get(stateKey);

    let best = 0n;
    for (let panel = 0; panel < 3; panel++) {
      if (revealed.has(panel)) continue;
      if (!indices.some(index => worlds[index].panels[panel] >= 2)) continue;

      let action = 0n;
      for (const outcome of [1, 2, 3]) {
        const branch = indices.filter(
          index => worlds[index].panels[panel] === outcome
        );
        if (branch.length === 0) continue;
        const nextRevealed = new Set(revealed);
        nextRevealed.add(panel);
        action += value(branch, nextRevealed);
      }
      if (action > best) best = action;
    }

    memo.set(stateKey, best);
    return best;
  }

  assert.equal(value([0, 1, 2, 3], new Set()), 2n);
});
