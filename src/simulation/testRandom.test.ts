import { describe, expect, it } from "vitest";
import { sequenceRandom } from "./testRandom";

describe("sequenceRandom", () => {
  it("returns the sequence then repeats its final value", () => {
    const random = sequenceRandom([0.2, 0.8]);

    expect([random(), random(), random()]).toEqual([0.2, 0.8, 0.8]);
  });

  it("returns zero for an empty sequence", () => {
    expect(sequenceRandom([])()).toBe(0);
  });
});
