import { Simulation } from "./Simulation";
import { Material } from "./materials";

export type ExampleSceneId =
  | "lavaWater"
  | "acidCorrosion"
  | "plantGrowth"
  | "oilFire";

export type ExampleScene = {
  id: ExampleSceneId;
  label: string;
};

export const EXAMPLE_SCENES: readonly ExampleScene[] = [
  { id: "lavaWater", label: "熔岩遇水" },
  { id: "acidCorrosion", label: "酸液腐蚀" },
  { id: "plantGrowth", label: "植物生长" },
  { id: "oilFire", label: "油火反应" },
] as const;

export function applyExampleScene(
  simulation: Simulation,
  sceneId: ExampleSceneId,
): void {
  simulation.clear();
  const centerX = Math.floor(simulation.width / 2);
  const centerY = Math.floor(simulation.height / 2);

  switch (sceneId) {
    case "lavaWater":
      simulation.paintCircle(centerX - 2, centerY, 2, Material.Water);
      simulation.paintCircle(centerX + 2, centerY, 2, Material.Lava);
      break;
    case "acidCorrosion":
      simulation.paintCircle(centerX - 3, centerY, 1, Material.Wall);
      simulation.paintCircle(centerX - 1, centerY, 1, Material.Stone);
      simulation.paintCircle(centerX + 2, centerY, 1, Material.Acid);
      break;
    case "plantGrowth":
      simulation.paintCircle(centerX, centerY, 1, Material.Plant);
      simulation.paintCircle(centerX, centerY - 2, 1, Material.Water);
      break;
    case "oilFire":
      simulation.paintCircle(centerX, centerY, 2, Material.Oil);
      simulation.paintCircle(centerX - 3, centerY, 1, Material.Fire);
      break;
  }
}
