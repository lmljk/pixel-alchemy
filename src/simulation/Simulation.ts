import { Material } from "./materials";

type RandomSource = () => number;

export class Simulation {
  readonly cells: Uint8Array;
  private readonly processed: Uint8Array;
  private scanLeftToRight = true;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly random: RandomSource = Math.random,
  ) {
    this.cells = new Uint8Array(width * height);
    this.processed = new Uint8Array(width * height);
  }

  getCell(x: number, y: number): Material | undefined {
    if (!this.isInBounds(x, y)) return undefined;
    return this.cells[this.indexOf(x, y)] as Material;
  }

  paintCircle(
    centerX: number,
    centerY: number,
    radius: number,
    material: Material,
  ): void {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (!this.isInBounds(x, y)) continue;
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          this.cells[this.indexOf(x, y)] = material;
        }
      }
    }
  }

  clear(): void {
    this.cells.fill(Material.Empty);
  }

  step(): void {
    const leftToRight = this.scanLeftToRight;
    this.processed.fill(0);

    for (let y = this.height - 1; y >= 0; y -= 1) {
      const startX = leftToRight ? 0 : this.width - 1;
      const endX = leftToRight ? this.width : -1;
      const stepX = leftToRight ? 1 : -1;

      for (let x = startX; x !== endX; x += stepX) {
        const index = this.indexOf(x, y);
        if (this.processed[index]) continue;

        switch (this.getCell(x, y)) {
          case Material.Sand:
            this.stepSand(x, y);
            break;
          case Material.Stone:
            this.tryMove(x, y, x, y + 1);
            break;
          case Material.Water:
          case Material.Oil:
            this.stepLiquid(
              x,
              y,
              this.getCell(x, y) as Material.Water | Material.Oil,
            );
            break;
          case Material.Fire:
            this.stepFire(x, y);
            break;
          case Material.Plant:
            this.stepPlant(x, y);
            break;
        }
      }
    }

    this.scanLeftToRight = !this.scanLeftToRight;
  }

  private stepSand(x: number, y: number): void {
    if (y >= this.height - 1) return;
    if (this.tryMove(x, y, x, y + 1)) return;

    const diagonalOffsets = this.random() < 0.5 ? [-1, 1] : [1, -1];
    for (const offset of diagonalOffsets) {
      if (this.tryMove(x, y, x + offset, y + 1)) return;
    }
  }

  private stepFire(x: number, y: number): void {
    const flammableNeighbors = this.neighbors4(x, y).filter(
      ({ x: neighborX, y: neighborY }) => {
        const material = this.getCell(neighborX, neighborY);
        return (
          material === Material.Wood ||
          material === Material.Oil ||
          material === Material.Plant
        );
      },
    );

    if (flammableNeighbors.length > 0) {
      const targetIndex = Math.min(
        Math.floor(this.random() * flammableNeighbors.length),
        flammableNeighbors.length - 1,
      );
      const target = flammableNeighbors[targetIndex];
      this.setMaterial(target.x, target.y, Material.Fire);
    }

    const fireRoll = this.random();
    if (fireRoll < 0.18) {
      this.setMaterial(x, y, Material.Empty);
      return;
    }

    if (this.tryMove(x, y, x, y - 1)) return;

    const offsets = fireRoll < 0.59 ? [-1, 1] : [1, -1];
    for (const offset of offsets) {
      if (this.tryMove(x, y, x + offset, y - 1)) return;
    }
  }

  private stepPlant(x: number, y: number): void {
    const waterNeighbors = this.neighbors4(x, y).filter(
      ({ x: neighborX, y: neighborY }) =>
        this.getCell(neighborX, neighborY) === Material.Water,
    );
    const water = this.choosePoint(waterNeighbors);
    if (!water) return;

    const growthTargets = this.neighbors4(water.x, water.y).filter(
      (point) =>
        (point.x !== x || point.y !== y) &&
        this.getCell(point.x, point.y) === Material.Empty,
    );
    const target = this.choosePoint(growthTargets);
    if (!target) return;

    this.setMaterial(water.x, water.y, Material.Empty);
    this.setMaterial(target.x, target.y, Material.Plant);
  }

  private stepLiquid(
    x: number,
    y: number,
    material: Material.Water | Material.Oil,
  ): void {
    if (
      material === Material.Water &&
      this.getCell(x, y + 1) === Material.Oil
    ) {
      this.swap(x, y, x, y + 1);
      return;
    }

    if (this.tryMove(x, y, x, y + 1)) return;

    const offsets = this.random() < 0.5 ? [-1, 1] : [1, -1];
    for (const offset of offsets) {
      if (this.tryMove(x, y, x + offset, y + 1)) return;
    }

    for (const offset of offsets) {
      for (let distance = 1; distance <= 3; distance += 1) {
        const targetX = x + offset * distance;
        const target = this.getCell(targetX, y);
        if (target === undefined || target !== Material.Empty) break;
        this.move(x, y, targetX, y);
        return;
      }
    }
  }

  private tryMove(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): boolean {
    if (this.getCell(toX, toY) !== Material.Empty) return false;
    this.move(fromX, fromY, toX, toY);
    return true;
  }

  private move(fromX: number, fromY: number, toX: number, toY: number): void {
    const fromIndex = this.indexOf(fromX, fromY);
    const toIndex = this.indexOf(toX, toY);
    this.cells[toIndex] = this.cells[fromIndex];
    this.cells[fromIndex] = Material.Empty;
    this.processed[toIndex] = 1;
  }

  private swap(fromX: number, fromY: number, toX: number, toY: number): void {
    const fromIndex = this.indexOf(fromX, fromY);
    const toIndex = this.indexOf(toX, toY);
    const target = this.cells[toIndex];
    this.cells[toIndex] = this.cells[fromIndex];
    this.cells[fromIndex] = target;
    this.processed[fromIndex] = 1;
    this.processed[toIndex] = 1;
  }

  private setMaterial(x: number, y: number, material: Material): void {
    if (!this.isInBounds(x, y)) return;
    const index = this.indexOf(x, y);
    this.cells[index] = material;
    this.processed[index] = 1;
  }

  private neighbors4(
    x: number,
    y: number,
  ): Array<{ x: number; y: number }> {
    return [
      { x, y: y - 1 },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x - 1, y },
    ].filter((point) => this.isInBounds(point.x, point.y));
  }

  private choosePoint<T>(points: readonly T[]): T | undefined {
    if (points.length === 0) return undefined;
    if (points.length === 1) return points[0];
    const index = Math.min(
      Math.floor(this.random() * points.length),
      points.length - 1,
    );
    return points[index];
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
