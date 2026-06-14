import { describe, expect, it } from "vitest";
import { clientPointToGrid, interpolateGridLine } from "./geometry";

describe("clientPointToGrid", () => {
  const rect = { left: 10, top: 20, width: 320, height: 320 };

  it("maps a client point into grid coordinates", () => {
    expect(clientPointToGrid(170, 180, rect, 160, 160)).toEqual({
      x: 80,
      y: 80,
    });
  });

  it("rejects points outside the canvas bounds", () => {
    expect(clientPointToGrid(9, 180, rect, 160, 160)).toBeNull();
    expect(clientPointToGrid(330, 180, rect, 160, 160)).toBeNull();
    expect(clientPointToGrid(170, 340, rect, 160, 160)).toBeNull();
  });
});

describe("interpolateGridLine", () => {
  it("includes every point on a horizontal line", () => {
    expect(interpolateGridLine({ x: 1, y: 2 }, { x: 5, y: 2 })).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });
});
