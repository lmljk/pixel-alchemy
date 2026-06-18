import { describe, expect, it } from "vitest";
import {
  EXAMPLE_SCENES,
  applyExampleScene,
  type ExampleSceneId,
} from "./exampleScenes";
import { Material } from "./materials";
import { Simulation } from "./Simulation";

function materialCount(simulation: Simulation, material: Material): number {
  return Array.from(simulation.cells).filter((cell) => cell === material)
    .length;
}

describe("exampleScenes", () => {
  it("defines the four playtest scenes in a stable order", () => {
    expect(EXAMPLE_SCENES.map((scene) => scene.id)).toEqual([
      "lavaWater",
      "acidCorrosion",
      "plantGrowth",
      "oilFire",
    ]);
    expect(EXAMPLE_SCENES.map((scene) => scene.label)).toEqual([
      "熔岩遇水",
      "酸液腐蚀",
      "植物生长",
      "油火反应",
    ]);
    expect(EXAMPLE_SCENES.map((scene) => scene.description)).toEqual([
      "熔岩遇水会变成石头，并冒出蒸汽。",
      "酸液会咬掉墙和石头，自己也一起消失。",
      "植物吸收水后会向周围扩散。",
      "火会点燃油，火焰向上漂。",
    ]);
  });

  it.each([
    ["lavaWater", [Material.Water, Material.Lava]],
    ["acidCorrosion", [Material.Acid, Material.Wall, Material.Stone]],
    ["plantGrowth", [Material.Plant, Material.Water]],
    ["oilFire", [Material.Oil, Material.Fire]],
  ] as Array<[ExampleSceneId, Material[]]>)(
    "clears the grid and draws %s",
    (sceneId, expectedMaterials) => {
      const simulation = new Simulation(40, 40, () => 0);
      simulation.paintCircle(0, 0, 0, Material.Sand);

      applyExampleScene(simulation, sceneId);

      expect(simulation.getCell(0, 0)).toBe(Material.Empty);
      for (const material of expectedMaterials) {
        expect(materialCount(simulation, material)).toBeGreaterThan(0);
      }
      expect(simulation.cells).toHaveLength(40 * 40);
    },
  );
});
