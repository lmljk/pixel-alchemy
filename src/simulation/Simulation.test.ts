import { describe, expect, it } from "vitest";
import { Material } from "./materials";
import { Simulation } from "./Simulation";
import { sequenceRandom } from "./testRandom";

describe("Simulation", () => {
  it("starts with an empty grid", () => {
    const simulation = new Simulation(4, 4, () => 0);

    expect(simulation.cells).toEqual(new Uint8Array(16));
  });

  it("moves sand down one cell when space is empty", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(1, 2)).toBe(Material.Sand);
  });

  it("slides sand down-left when below and down-right are blocked", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    simulation.paintCircle(1, 2, 0, Material.Sand);
    simulation.paintCircle(2, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(0, 2)).toBe(Material.Sand);
  });

  it("prefers down-right when random is at least 0.5", () => {
    const simulation = new Simulation(3, 3, () => 0.5);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    simulation.paintCircle(1, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(2, 2)).toBe(Material.Sand);
  });

  it("tries the other diagonal when the preferred side is blocked", () => {
    const simulation = new Simulation(3, 3, () => 0.5);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    simulation.paintCircle(1, 2, 0, Material.Sand);
    simulation.paintCircle(2, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(0, 2)).toBe(Material.Sand);
  });

  it("tries the in-bounds diagonal when the preferred edge is out of bounds", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(0, 1, 0, Material.Sand);
    simulation.paintCircle(0, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(0, 1)).toBe(Material.Empty);
    expect(simulation.getCell(1, 2)).toBe(Material.Sand);
  });

  it("keeps sand still when all cells below are blocked", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    simulation.paintCircle(0, 2, 0, Material.Sand);
    simulation.paintCircle(1, 2, 0, Material.Sand);
    simulation.paintCircle(2, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Sand);
  });

  it("uses the same scan direction for every row in a step", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(0, 1, 0, Material.Sand);
    simulation.paintCircle(2, 1, 0, Material.Sand);
    simulation.paintCircle(0, 2, 0, Material.Sand);
    simulation.paintCircle(2, 2, 0, Material.Sand);
    simulation.paintCircle(0, 3, 0, Material.Sand);
    simulation.paintCircle(1, 3, 0, Material.Sand);
    simulation.paintCircle(2, 3, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(0, 1)).toBe(Material.Empty);
    expect(simulation.getCell(1, 2)).toBe(Material.Sand);
    expect(simulation.getCell(2, 1)).toBe(Material.Sand);
  });

  it("reverses scan direction on the next step", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.step();
    simulation.paintCircle(0, 1, 0, Material.Sand);
    simulation.paintCircle(2, 1, 0, Material.Sand);
    simulation.paintCircle(0, 2, 0, Material.Sand);
    simulation.paintCircle(2, 2, 0, Material.Sand);

    simulation.step();

    expect(simulation.getCell(0, 1)).toBe(Material.Sand);
    expect(simulation.getCell(1, 2)).toBe(Material.Sand);
    expect(simulation.getCell(2, 1)).toBe(Material.Empty);
  });

  it("erases sand inside a circle when painting empty material", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 1, Material.Sand);

    simulation.paintCircle(1, 1, 1, Material.Empty);

    expect(simulation.cells).toEqual(new Uint8Array(9));
  });

  it("clears all cells", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 1, Material.Sand);

    simulation.clear();

    expect(simulation.cells).toEqual(new Uint8Array(9));
  });

  it("ignores out-of-bounds brushes and reads", () => {
    const simulation = new Simulation(3, 3, () => 0);

    expect(() =>
      simulation.paintCircle(-2, -2, 1, Material.Sand),
    ).not.toThrow();
    expect(simulation.cells).toEqual(new Uint8Array(9));
    expect(simulation.getCell(-1, 0)).toBeUndefined();
    expect(simulation.getCell(3, 0)).toBeUndefined();
    expect(simulation.getCell(0, -1)).toBeUndefined();
    expect(simulation.getCell(0, 3)).toBeUndefined();
  });

  it("keeps walls fixed", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Wall);
  });

  it("moves stone only straight down", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Stone);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(1, 2)).toBe(Material.Stone);
  });

  it("does not slide stone diagonally", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Stone);
    simulation.paintCircle(1, 2, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Stone);
  });

  it("moves a falling particle at most once per step", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(1, 0, 0, Material.Stone);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Stone);
    expect(simulation.getCell(1, 2)).toBe(Material.Empty);
  });

  it("moves water straight down", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Water);

    simulation.step();

    expect(simulation.getCell(1, 2)).toBe(Material.Water);
  });

  it("moves water diagonally when the space below is blocked", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Water);
    simulation.paintCircle(1, 2, 0, Material.Wall);
    simulation.paintCircle(2, 2, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(0, 2)).toBe(Material.Water);
  });

  it("moves water horizontally when lower routes are blocked", () => {
    const simulation = new Simulation(7, 3, () => 0);
    simulation.paintCircle(3, 1, 0, Material.Water);
    for (let x = 0; x < 7; x += 1) {
      simulation.paintCircle(x, 2, 0, Material.Wall);
    }

    simulation.step();

    expect(simulation.getCell(2, 1)).toBe(Material.Water);
    expect(simulation.getCell(3, 1)).toBe(Material.Empty);
  });

  it("stops horizontal liquid flow at a blocking cell", () => {
    const simulation = new Simulation(7, 3, () => 0);
    simulation.paintCircle(3, 1, 0, Material.Water);
    simulation.paintCircle(2, 1, 0, Material.Wall);
    for (let x = 0; x < 7; x += 1) {
      simulation.paintCircle(x, 2, 0, Material.Wall);
    }

    simulation.step();

    expect(simulation.getCell(4, 1)).toBe(Material.Water);
  });

  it("swaps water downward through oil", () => {
    const simulation = new Simulation(3, 3, sequenceRandom([0]));
    simulation.paintCircle(1, 1, 0, Material.Water);
    simulation.paintCircle(1, 2, 0, Material.Oil);
    simulation.paintCircle(0, 2, 0, Material.Wall);
    simulation.paintCircle(2, 2, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Oil);
    expect(simulation.getCell(1, 2)).toBe(Material.Water);
  });

  it("does not swap oil downward through water", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Oil);
    simulation.paintCircle(1, 2, 0, Material.Water);
    simulation.paintCircle(0, 2, 0, Material.Wall);
    simulation.paintCircle(2, 2, 0, Material.Wall);
    simulation.paintCircle(0, 1, 0, Material.Wall);
    simulation.paintCircle(2, 1, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Oil);
    expect(simulation.getCell(1, 2)).toBe(Material.Water);
  });

  it("lets oil fall and flow like a liquid", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Oil);

    simulation.step();

    expect(simulation.getCell(1, 2)).toBe(Material.Oil);
  });

  it.each([
    ["wood", Material.Wood],
    ["oil", Material.Oil],
    ["plant", Material.Plant],
  ])("ignites %s beside fire", (_name, material) => {
    const simulation = new Simulation(3, 3, () => 0.9);
    simulation.paintCircle(1, 1, 0, material);
    simulation.paintCircle(1, 2, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Fire);
  });

  it("does not ignite a diagonal flammable cell", () => {
    const simulation = new Simulation(3, 3, () => 0.9);
    simulation.paintCircle(1, 1, 0, Material.Wood);
    simulation.paintCircle(0, 0, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Wood);
  });

  it("lets fire ignite only one neighboring target per step", () => {
    const simulation = new Simulation(
      3,
      3,
      sequenceRandom([0.7, 0.9]),
    );
    simulation.paintCircle(1, 1, 0, Material.Fire);
    simulation.paintCircle(1, 0, 0, Material.Wood);
    simulation.paintCircle(2, 1, 0, Material.Wood);

    simulation.step();

    const ignited = [
      simulation.getCell(1, 0),
      simulation.getCell(2, 1),
    ].filter((material) => material === Material.Fire);
    expect(ignited).toHaveLength(1);
  });

  it("extinguishes fire below the lifetime threshold", () => {
    const simulation = new Simulation(3, 3, () => 0.1);
    simulation.paintCircle(1, 1, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
  });

  it("moves surviving fire upward", () => {
    const simulation = new Simulation(3, 3, () => 0.9);
    simulation.paintCircle(1, 1, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(1, 0)).toBe(Material.Fire);
  });

  it("moves blocked fire up-left for a low surviving roll", () => {
    const simulation = new Simulation(3, 3, () => 0.3);
    simulation.paintCircle(1, 1, 0, Material.Fire);
    simulation.paintCircle(1, 0, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(0, 0)).toBe(Material.Fire);
  });

  it("moves blocked fire up-right for a high roll", () => {
    const simulation = new Simulation(3, 3, () => 0.8);
    simulation.paintCircle(1, 1, 0, Material.Fire);
    simulation.paintCircle(1, 0, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(2, 0)).toBe(Material.Fire);
  });

  it("moves fire at most once per step", () => {
    const simulation = new Simulation(3, 4, () => 0.9);
    simulation.paintCircle(1, 2, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Fire);
    expect(simulation.getCell(1, 0)).toBe(Material.Empty);
  });

  it("moves steam upward when it does not condense", () => {
    const simulation = new Simulation(3, 3, () => 0.9);
    simulation.paintCircle(1, 1, 0, Material.Steam);

    simulation.step();

    expect(simulation.getCell(1, 0)).toBe(Material.Steam);
    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
  });

  it("condenses steam into water without moving the water in the same step", () => {
    const simulation = new Simulation(3, 3, () => 0.05);
    simulation.paintCircle(1, 1, 0, Material.Steam);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Water);
    expect(simulation.getCell(1, 2)).toBe(Material.Empty);
  });

  it("moves blocked steam up-left for a low roll", () => {
    const simulation = new Simulation(3, 3, () => 0.2);
    simulation.paintCircle(1, 1, 0, Material.Steam);
    simulation.paintCircle(1, 0, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(0, 0)).toBe(Material.Steam);
  });

  it("moves blocked steam up-right for a high roll", () => {
    const simulation = new Simulation(3, 3, () => 0.8);
    simulation.paintCircle(1, 1, 0, Material.Steam);
    simulation.paintCircle(1, 0, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(2, 0)).toBe(Material.Steam);
  });

  it("turns lava into stone and neighboring water into steam", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Lava);
    simulation.paintCircle(1, 0, 0, Material.Water);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Stone);
    expect(simulation.getCell(1, 0)).toBe(Material.Steam);
  });

  it.each([
    ["wood", Material.Wood],
    ["oil", Material.Oil],
    ["plant", Material.Plant],
  ])("lets lava ignite neighboring %s", (_name, material) => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Lava);
    simulation.paintCircle(1, 0, 0, material);

    simulation.step();

    expect(simulation.getCell(1, 0)).toBe(Material.Fire);
    expect(simulation.getCell(1, 1)).toBe(Material.Lava);
  });

  it("keeps lava still when the slow movement roll is high", () => {
    const simulation = new Simulation(3, 3, () => 0.9);
    simulation.paintCircle(1, 1, 0, Material.Lava);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Lava);
    expect(simulation.getCell(1, 2)).toBe(Material.Empty);
  });

  it("lets lava flow when the slow movement roll is low", () => {
    const simulation = new Simulation(3, 3, () => 0.1);
    simulation.paintCircle(1, 1, 0, Material.Lava);

    simulation.step();

    expect(simulation.getCell(1, 2)).toBe(Material.Lava);
    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
  });

  it("grows a plant into empty space by consuming adjacent water", () => {
    const simulation = new Simulation(5, 5, () => 0);
    simulation.paintCircle(2, 2, 0, Material.Plant);
    simulation.paintCircle(2, 1, 0, Material.Water);
    simulation.paintCircle(2, 0, 0, Material.Wall);
    simulation.paintCircle(1, 1, 0, Material.Wall);
    simulation.paintCircle(1, 2, 0, Material.Wall);
    simulation.paintCircle(3, 2, 0, Material.Wall);

    simulation.step();

    expect(simulation.getCell(2, 1)).toBe(Material.Empty);
    expect(simulation.getCell(3, 1)).toBe(Material.Plant);
  });

  it("does not let a new plant grow again in the same step", () => {
    const simulation = new Simulation(5, 5, () => 0);
    simulation.paintCircle(2, 2, 0, Material.Plant);
    simulation.paintCircle(2, 1, 0, Material.Water);
    simulation.paintCircle(2, 0, 0, Material.Wall);
    simulation.paintCircle(1, 1, 0, Material.Wall);
    simulation.paintCircle(1, 2, 0, Material.Wall);
    simulation.paintCircle(3, 2, 0, Material.Wall);
    simulation.paintCircle(4, 1, 0, Material.Water);

    simulation.step();

    expect(
      Array.from(simulation.cells).filter(
        (material) => material === Material.Plant,
      ),
    ).toHaveLength(2);
  });

  it("ignites a plant before it can grow", () => {
    const simulation = new Simulation(5, 5, () => 0.9);
    simulation.paintCircle(2, 2, 0, Material.Plant);
    simulation.paintCircle(2, 1, 0, Material.Water);
    simulation.paintCircle(2, 3, 0, Material.Fire);

    simulation.step();

    expect(simulation.getCell(2, 2)).toBe(Material.Fire);
    expect(
      Array.from(simulation.cells).filter(
        (material) => material === Material.Plant,
      ),
    ).toHaveLength(0);
  });

  it("keeps a plant unchanged without adjacent water", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Plant);

    simulation.step();

    expect(simulation.getCell(1, 1)).toBe(Material.Plant);
  });

  it("does not grow from diagonal-only water", () => {
    const simulation = new Simulation(4, 4, () => 0);
    simulation.paintCircle(2, 2, 0, Material.Plant);
    simulation.paintCircle(1, 1, 0, Material.Water);

    simulation.step();

    expect(
      Array.from(simulation.cells).filter(
        (material) => material === Material.Plant,
      ),
    ).toHaveLength(1);
  });

  it("creates an isolated snapshot with the next scan direction", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    simulation.step();

    const snapshot = simulation.createSnapshot();
    snapshot.cells.fill(Material.Fire);

    expect(snapshot.scanLeftToRight).toBe(false);
    expect(simulation.cells).not.toEqual(snapshot.cells);
  });

  it("restores cells and scan direction without sharing the input buffer", () => {
    const cells = new Uint8Array([
      Material.Sand,
      Material.Empty,
      Material.Sand,
    ]);
    const simulation = Simulation.fromSnapshot(
      {
        width: 3,
        height: 1,
        cells,
        scanLeftToRight: false,
      },
      () => 0,
    );
    cells.fill(Material.Fire);

    expect(simulation.createSnapshot()).toEqual({
      width: 3,
      height: 1,
      cells: new Uint8Array([
        Material.Sand,
        Material.Empty,
        Material.Sand,
      ]),
      scanLeftToRight: false,
    });
  });

  it("rejects snapshots whose dimensions do not match the grid", () => {
    expect(() =>
      Simulation.fromSnapshot(
        {
          width: 2,
          height: 2,
          cells: new Uint8Array(3),
          scanLeftToRight: true,
        },
        () => 0,
      ),
    ).toThrow("Snapshot dimensions do not match its grid");
  });
});
