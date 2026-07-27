export function autoAdvanceDelay(field, rawValue) {
  const text = String(rawValue).trim();
  if (!/^\d{1,2}$/.test(text)) return null;

  const value = Number(text);
  if (field === "voltorbCount") {
    return text.length === 1 && value <= 5 ? 0 : null;
  }

  if (field !== "sum" || value > 15) return null;
  if (text.length === 2) return value >= 10 ? 0 : null;
  return 0;
}

export function possibleDoubleDigitLineSums(levelTypes) {
  const sums = new Set();

  for (const type of levelTypes) {
    const onesAvailable = 25 - type.n0 - type.n2 - type.n3;
    for (let voltorbs = 0; voltorbs <= Math.min(5, type.n0); voltorbs++) {
      for (let twos = 0; twos <= Math.min(5 - voltorbs, type.n2); twos++) {
        for (
          let threes = 0;
          threes <= Math.min(5 - voltorbs - twos, type.n3);
          threes++
        ) {
          const ones = 5 - voltorbs - twos - threes;
          if (ones > onesAvailable) continue;

          const multipliers = twos + threes;
          if (
            voltorbs === 0 &&
            (
              multipliers >= type.maxRowFree ||
              multipliers >= type.maxTotalFree
            )
          ) {
            continue;
          }

          const sum = ones + twos * 2 + threes * 3;
          if (sum >= 10) sums.add(sum);
        }
      }
    }
  }

  return sums;
}

export function promotePointTotal(levelTypes, possibleVoltorbCount) {
  const text = String(possibleVoltorbCount).trim();
  if (!/^\d$/.test(text)) return null;

  const voltorbs = Number(text);
  const nonVoltorbs = 5 - voltorbs;
  const oneIsValidTotal =
    1 >= nonVoltorbs &&
    1 <= nonVoltorbs * 3;
  if (oneIsValidTotal) return null;

  const promoted = 10 + voltorbs;
  return possibleDoubleDigitLineSums(levelTypes).has(promoted)
    ? promoted
    : null;
}
