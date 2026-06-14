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
});
