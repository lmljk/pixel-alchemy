import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";

const SAND_COLORS = [
  [207, 145, 59],
  [217, 157, 70],
  [191, 125, 46],
] as const;

export function renderSimulation(
  simulation: Simulation,
  imageData: ImageData,
): void {
  for (let index = 0; index < simulation.cells.length; index += 1) {
    const pixel = index * 4;
    if (simulation.cells[index] === Material.Empty) {
      imageData.data[pixel] = 0;
      imageData.data[pixel + 1] = 0;
      imageData.data[pixel + 2] = 0;
      imageData.data[pixel + 3] = 0;
      continue;
    }

    const color = SAND_COLORS[index % SAND_COLORS.length];
    imageData.data[pixel] = color[0];
    imageData.data[pixel + 1] = color[1];
    imageData.data[pixel + 2] = color[2];
    imageData.data[pixel + 3] = 255;
  }
}
