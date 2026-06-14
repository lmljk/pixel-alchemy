const UINT32_RANGE = 0x1_0000_0000;

export class SeededRandom {
  private state: number;

  constructor(state: number) {
    this.state = state >>> 0;
  }

  next = (): number => {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };

  getState(): number {
    return this.state;
  }
}

export function createInitialSeed(): number {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }

  return Date.now() >>> 0;
}
