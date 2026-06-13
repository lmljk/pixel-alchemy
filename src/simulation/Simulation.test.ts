import { describe, expect, it } from "vitest";
import { Material } from "./materials";
import { Simulation } from "./Simulation";

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
});
