import { describe, expect, it } from "vitest";
import {
  clientPointToGrid,
  interpolateGridLine,
  type GridPoint,
} from "./geometry";

function expectContinuousLine(
  points: GridPoint[],
  start: GridPoint,
  end: GridPoint,
): void {
  expect(points[0]).toEqual(start);
  expect(points.at(-1)).toEqual(end);

  for (let index = 1; index < points.length; index += 1) {
    expect(Math.abs(points[index].x - points[index - 1].x)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(points[index].y - points[index - 1].y)).toBeLessThanOrEqual(
      1,
    );
  }
}

describe("clientPointToGrid", () => {
  const rect = { left: 10, top: 20, width: 320, height: 320 };

  it("maps a client point into grid coordinates", () => {
    expect(clientPointToGrid(rect, 160, 160, 170, 180)).toEqual({
      x: 80,
      y: 80,
    });
  });

  it("includes the top-left canvas boundary", () => {
    expect(clientPointToGrid(rect, 160, 160, 10, 20)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("maps the last point inside the bottom-right boundary", () => {
    expect(clientPointToGrid(rect, 160, 160, 329, 339)).toEqual({
      x: 159,
      y: 159,
    });
  });

  it("rejects points outside the canvas bounds", () => {
    expect(clientPointToGrid(rect, 160, 160, 9, 20)).toBeNull();
    expect(clientPointToGrid(rect, 160, 160, 330, 341)).toBeNull();
  });

  it.each([
    [{ ...rect, width: 0 }, 160, 160],
    [{ ...rect, height: -1 }, 160, 160],
    [{ ...rect, width: Number.POSITIVE_INFINITY }, 160, 160],
    [rect, 0, 160],
    [rect, 160, -1],
    [rect, 160.5, 160],
  ])(
    "rejects invalid canvas or grid dimensions",
    (invalidRect, gridWidth, gridHeight) => {
      expect(
        clientPointToGrid(invalidRect, gridWidth, gridHeight, 170, 180),
      ).toBeNull();
    },
  );
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

  it("returns one point when the endpoints are equal", () => {
    expect(interpolateGridLine({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual([
      { x: 3, y: 4 },
    ]);
  });

  it("terminates on a reversed vertical line", () => {
    expect(interpolateGridLine({ x: 2, y: 5 }, { x: 2, y: 1 })).toEqual([
      { x: 2, y: 5 },
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ]);
  });

  it("keeps steep lines continuous in both directions", () => {
    const start = { x: 2, y: 1 };
    const end = { x: 4, y: 6 };
    const forward = interpolateGridLine(start, end);
    const reverse = interpolateGridLine(end, start);

    expectContinuousLine(forward, start, end);
    expectContinuousLine(reverse, end, start);
    expect(reverse).toEqual([...forward].reverse());
  });
});
