import { describe, expect, it } from "vitest";
import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";
import { renderSimulation } from "./renderSimulation";

describe("renderSimulation", () => {
  it("renders empty cells transparent and sand cells amber", () => {
    const simulation = new Simulation(2, 1, () => 0);
    simulation.paintCircle(1, 0, 0, Material.Sand);
    const imageData = new ImageData(2, 1);

    renderSimulation(simulation, imageData);

    expect(Array.from(imageData.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(imageData.data.slice(4, 8))).toEqual([
      217, 157, 70, 255,
    ]);
  });

  it("clears every color channel when reusing image data for an empty cell", () => {
    const simulation = new Simulation(1, 1, () => 0);
    const imageData = new ImageData(1, 1);
    simulation.paintCircle(0, 0, 0, Material.Sand);
    renderSimulation(simulation, imageData);

    simulation.paintCircle(0, 0, 0, Material.Empty);
    renderSimulation(simulation, imageData);

    expect(Array.from(imageData.data)).toEqual([0, 0, 0, 0]);
  });
});
