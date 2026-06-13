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
});
