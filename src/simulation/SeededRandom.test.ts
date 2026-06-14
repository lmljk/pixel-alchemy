import { describe, expect, it } from "vitest";
import { SeededRandom } from "./SeededRandom";

describe("SeededRandom", () => {
  it("produces the same sequence from the same state", () => {
    const first = new SeededRandom(123);
    const second = new SeededRandom(123);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it("produces different sequences from different states", () => {
    const first = new SeededRandom(123);
    const second = new SeededRandom(124);

    expect([first.next(), first.next()]).not.toEqual([
      second.next(),
      second.next(),
    ]);
  });

  it("resumes from a saved state", () => {
    const source = new SeededRandom(456);
    source.next();
    const restored = new SeededRandom(source.getState());

    expect([restored.next(), restored.next()]).toEqual([
      source.next(),
      source.next(),
    ]);
  });

  it("keeps every value inside the unit interval", () => {
    const source = new SeededRandom(789);

    for (let index = 0; index < 100; index += 1) {
      const value = source.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
