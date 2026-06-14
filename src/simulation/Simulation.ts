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

    for (let y = this.height - 2; y >= 0; y -= 1) {
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
        }
      }
    }

    this.scanLeftToRight = !this.scanLeftToRight;
  }

  private stepSand(x: number, y: number): void {
    if (this.tryMove(x, y, x, y + 1)) return;

    const diagonalOffsets = this.random() < 0.5 ? [-1, 1] : [1, -1];
    for (const offset of diagonalOffsets) {
      if (this.tryMove(x, y, x + offset, y + 1)) return;
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

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
