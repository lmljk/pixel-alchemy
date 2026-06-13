# Day One Playable Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive React canvas sandbox where users can paint falling sand, erase particles, pause or resume simulation, and clear the grid.

**Architecture:** React owns only tool and control state. A framework-independent `Simulation` owns a `Uint8Array`, while `SandboxCanvas` runs a fixed-step animation loop, converts pointer input to grid coordinates, and renders pixels directly through Canvas 2D.

**Tech Stack:** React, TypeScript, Vite, Canvas 2D, Vitest, Testing Library, Browser/IAB

---

## File Map

- `package.json`: scripts and runtime/test dependencies
- `tsconfig.json`: shared TypeScript configuration
- `tsconfig.app.json`: browser application configuration
- `tsconfig.node.json`: Vite configuration typing
- `vite.config.ts`: Vite, React, and Vitest setup
- `index.html`: application entry document
- `src/main.tsx`: React root bootstrap
- `src/test/setup.ts`: jsdom Canvas primitives and Testing Library matchers
- `src/App.tsx`: page composition and low-frequency UI state
- `src/App.test.tsx`: top-level accessible control smoke test
- `src/styles.css`: warm-paper visual system and responsive layout
- `src/simulation/materials.ts`: stable material identifiers
- `src/simulation/Simulation.ts`: grid storage, painting, erasing, clearing, and sand updates
- `src/simulation/Simulation.test.ts`: deterministic engine tests
- `src/canvas/geometry.ts`: pointer-to-grid conversion and line interpolation
- `src/canvas/geometry.test.ts`: geometry boundary tests
- `src/canvas/renderSimulation.ts`: grid-to-ImageData renderer
- `src/canvas/renderSimulation.test.ts`: renderer pixel tests
- `src/canvas/SandboxCanvas.tsx`: animation loop and Pointer Events integration
- `src/canvas/SandboxCanvas.test.tsx`: paused/running and pointer interaction tests
- `src/components/Toolbar.tsx`: tool and simulation controls
- `src/components/Toolbar.test.tsx`: toolbar semantics and callbacks
- `docs/design/day-one-warm-paper-concept.png`: accepted visual reference generated from the approved mockup

## Task 1: Lock The Visual Reference And Toolchain

**Files:**
- Create: `docs/design/day-one-warm-paper-concept.png`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/test/setup.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Generate the production visual reference**

Use Image Gen with this exact prompt:

```text
Create one polished full-screen product design concept for a browser game called
"像素炼金术". This is the approved Day 1 interface, not a redesign exploration.

Desktop viewport 1280x720, with a clearly translatable 390x844 mobile layout.
Warm handmade notebook aesthetic: pale beige page, warm white square canvas,
deep brown typography and borders, amber sand pixels, short hard-edged offset
shadows. No gradients, glass, neon, pills, marketing hero, illustrations,
photographs, external branding, or decorative clutter.

Information architecture:
1. Compact header with Chinese title "像素炼金术" and small text "试验 01".
2. One large square pixel sandbox as the dominant surface.
3. Bottom toolbar with four native-looking rectangular controls:
   "沙子", "橡皮", "暂停", "清空".
4. "沙子" is visibly selected without relying only on color.
5. Show a small amber sand pile and a falling diagonal sand stroke inside the
   canvas so the game behavior is legible.

Keep all UI text code-native in the eventual implementation. Use this image as
a visual reference for spacing, palette, typography character, borders,
shadows, and hierarchy. Make the interface implementation-friendly and
accessible, with controls at least 44px tall.
```

Save the result as `docs/design/day-one-warm-paper-concept.png`.

- [ ] **Step 2: Create package metadata**

Create `package.json`:

```json
{
  "name": "pixel-alchemy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Install current compatible dependencies**

Run:

```bash
npm install react@latest react-dom@latest
npm install --save-dev typescript@latest vite@latest @vitejs/plugin-react@latest vitest@latest jsdom@latest @types/react@latest @types/react-dom@latest @testing-library/react@latest @testing-library/user-event@latest @testing-library/jest-dom@latest
```

Expected: commands exit `0` and generate `package-lock.json`.

- [ ] **Step 4: Add TypeScript and Vite configuration**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 5: Add shared jsdom Canvas setup**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class TestImageData {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

globalThis.ImageData = TestImageData as unknown as typeof ImageData;
vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
vi.stubGlobal("cancelAnimationFrame", vi.fn());

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => ({
    createImageData: (width: number, height: number) =>
      new ImageData(width, height),
    putImageData: vi.fn(),
  })),
});
```

- [ ] **Step 6: Keep generated output out of Git**

Append to `.gitignore`:

```gitignore
coverage/
```

- [ ] **Step 7: Verify dependency resolution**

Run:

```bash
npm ls --depth=0
```

Expected: exit `0` with React, Vite, TypeScript, Vitest, and Testing Library listed.

- [ ] **Step 8: Commit the baseline**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts .gitignore src/test/setup.ts docs/design/day-one-warm-paper-concept.png
git commit -m "chore: set up React sandbox toolchain"
```

## Task 2: Build The Grid And Vertical Gravity With TDD

**Files:**
- Create: `src/simulation/materials.ts`
- Create: `src/simulation/Simulation.ts`
- Create: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing storage and gravity tests**

Create `src/simulation/Simulation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because `./materials` and `./Simulation` do not exist.

- [ ] **Step 3: Implement the minimum grid and downward movement**

Create `src/simulation/materials.ts`:

```ts
export enum Material {
  Empty = 0,
  Sand = 1,
}
```

Create `src/simulation/Simulation.ts`:

```ts
import { Material } from "./materials";

type RandomSource = () => number;

export class Simulation {
  readonly cells: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly random: RandomSource = Math.random,
  ) {
    this.cells = new Uint8Array(width * height);
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

  step(): void {
    for (let y = this.height - 2; y >= 0; y -= 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.getCell(x, y) !== Material.Sand) continue;
        if (this.getCell(x, y + 1) === Material.Empty) {
          this.move(x, y, x, y + 1);
        }
      }
    }
  }

  private move(fromX: number, fromY: number, toX: number, toY: number): void {
    const fromIndex = this.indexOf(fromX, fromY);
    const toIndex = this.indexOf(toX, toY);
    this.cells[toIndex] = this.cells[fromIndex];
    this.cells[fromIndex] = Material.Empty;
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
```

The injected `random` is intentionally unused until Task 3.

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: `2` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/simulation
git commit -m "feat: add sand grid and vertical gravity"
```

## Task 3: Add Diagonal Sliding, Blocking, Erasing, And Clearing

**Files:**
- Modify: `src/simulation/Simulation.test.ts`
- Modify: `src/simulation/Simulation.ts`

- [ ] **Step 1: Add failing diagonal and blocked tests**

Append inside the existing `describe`:

```ts
it("slides sand into the first available diagonal cell", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Sand);
  simulation.paintCircle(1, 2, 0, Material.Sand);
  simulation.paintCircle(2, 2, 0, Material.Sand);

  simulation.step();

  expect(simulation.getCell(0, 2)).toBe(Material.Sand);
  expect(simulation.getCell(1, 1)).toBe(Material.Empty);
});

it("keeps sand still when down and both diagonals are blocked", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Sand);
  simulation.paintCircle(0, 2, 0, Material.Sand);
  simulation.paintCircle(1, 2, 0, Material.Sand);
  simulation.paintCircle(2, 2, 0, Material.Sand);

  simulation.step();

  expect(simulation.getCell(1, 1)).toBe(Material.Sand);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: diagonal sliding test fails because sand does not move diagonally.

- [ ] **Step 3: Implement diagonal sliding and alternating scan direction**

Replace `step()` and add `scanLeftToRight` plus `tryMove`:

```ts
private scanLeftToRight = true;

step(): void {
  for (let y = this.height - 2; y >= 0; y -= 1) {
    for (let offset = 0; offset < this.width; offset += 1) {
      const x = this.scanLeftToRight ? offset : this.width - 1 - offset;
      if (this.getCell(x, y) !== Material.Sand) continue;

      if (this.tryMove(x, y, x, y + 1)) continue;

      const directions = this.random() < 0.5 ? [-1, 1] : [1, -1];
      if (this.tryMove(x, y, x + directions[0], y + 1)) continue;
      this.tryMove(x, y, x + directions[1], y + 1);
    }
  }

  this.scanLeftToRight = !this.scanLeftToRight;
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
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: `4` tests pass.

- [ ] **Step 5: Add failing erase, clear, and boundary tests**

Append inside the existing `describe`:

```ts
it("erases particles inside the requested circle", () => {
  const simulation = new Simulation(5, 5, () => 0);
  simulation.paintCircle(2, 2, 1, Material.Sand);

  simulation.paintCircle(2, 2, 1, Material.Empty);

  expect(Array.from(simulation.cells)).not.toContain(Material.Sand);
});

it("clears every particle", () => {
  const simulation = new Simulation(4, 4, () => 0);
  simulation.paintCircle(1, 1, 2, Material.Sand);

  simulation.clear();

  expect(simulation.cells).toEqual(new Uint8Array(16));
});

it("ignores paint outside the grid", () => {
  const simulation = new Simulation(3, 3, () => 0);

  expect(() => {
    simulation.paintCircle(-5, -5, 2, Material.Sand);
    simulation.paintCircle(20, 20, 2, Material.Sand);
  }).not.toThrow();
  expect(simulation.cells).toEqual(new Uint8Array(9));
  expect(simulation.getCell(-1, 0)).toBeUndefined();
});
```

- [ ] **Step 6: Run the tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because `clear()` does not exist.

- [ ] **Step 7: Implement clear**

Add to `Simulation`:

```ts
clear(): void {
  this.cells.fill(Material.Empty);
}
```

- [ ] **Step 8: Run all simulation tests**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: `7` tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/simulation
git commit -m "feat: complete day one sand interactions"
```

## Task 4: Build Pointer Geometry With TDD

**Files:**
- Create: `src/canvas/geometry.ts`
- Create: `src/canvas/geometry.test.ts`

- [ ] **Step 1: Write failing coordinate conversion tests**

Create `src/canvas/geometry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clientPointToGrid, interpolateGridLine } from "./geometry";

describe("clientPointToGrid", () => {
  const rect = {
    left: 10,
    top: 20,
    width: 320,
    height: 320,
  };

  it("maps a client point into grid coordinates", () => {
    expect(clientPointToGrid(rect, 160, 160, 170, 180)).toEqual({
      x: 80,
      y: 80,
    });
  });

  it("returns null for a point outside the canvas", () => {
    expect(clientPointToGrid(rect, 160, 160, 9, 20)).toBeNull();
    expect(clientPointToGrid(rect, 160, 160, 330, 341)).toBeNull();
  });
});

describe("interpolateGridLine", () => {
  it("includes every grid position along a fast horizontal stroke", () => {
    expect(interpolateGridLine({ x: 1, y: 2 }, { x: 5, y: 2 })).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/canvas/geometry.test.ts
```

Expected: FAIL because `geometry.ts` does not exist.

- [ ] **Step 3: Implement coordinate conversion and Bresenham interpolation**

Create `src/canvas/geometry.ts`:

```ts
export type GridPoint = {
  x: number;
  y: number;
};

type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function clientPointToGrid(
  rect: RectLike,
  gridWidth: number,
  gridHeight: number,
  clientX: number,
  clientY: number,
): GridPoint | null {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  if (
    localX < 0 ||
    localY < 0 ||
    localX >= rect.width ||
    localY >= rect.height
  ) {
    return null;
  }

  return {
    x: Math.min(gridWidth - 1, Math.floor((localX / rect.width) * gridWidth)),
    y: Math.min(gridHeight - 1, Math.floor((localY / rect.height) * gridHeight)),
  };
}

export function interpolateGridLine(
  start: GridPoint,
  end: GridPoint,
): GridPoint[] {
  const points: GridPoint[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const sx = start.x < end.x ? 1 : -1;
  const dy = -Math.abs(end.y - start.y);
  const sy = start.y < end.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x, y });
    if (x === end.x && y === end.y) break;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y += sy;
    }
  }

  return points;
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
npm test -- src/canvas/geometry.test.ts
```

Expected: `3` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/geometry.ts src/canvas/geometry.test.ts
git commit -m "feat: add continuous pointer geometry"
```

## Task 5: Build And Test The Pixel Renderer

**Files:**
- Create: `src/canvas/renderSimulation.ts`
- Create: `src/canvas/renderSimulation.test.ts`

- [ ] **Step 1: Write the failing renderer test**

Create `src/canvas/renderSimulation.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- src/canvas/renderSimulation.test.ts
```

Expected: FAIL because `renderSimulation` does not exist.

- [ ] **Step 3: Implement deterministic pixel colors**

Create `src/canvas/renderSimulation.ts`:

```ts
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
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
npm test -- src/canvas/renderSimulation.test.ts
```

Expected: `1` test passes.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/renderSimulation.ts src/canvas/renderSimulation.test.ts
git commit -m "feat: render simulation pixels"
```

## Task 6: Build The Toolbar With TDD

**Files:**
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Write failing toolbar behavior tests**

Create `src/components/Toolbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Material } from "../simulation/materials";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  it("marks the current material and changes tools", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();

    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        onToolChange={onToolChange}
        onPauseChange={() => undefined}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "沙子" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "橡皮" }));
    expect(onToolChange).toHaveBeenCalledWith(Material.Empty);
  });

  it("exposes pause and clear actions", async () => {
    const user = userEvent.setup();
    const onPauseChange = vi.fn();
    const onClear = vi.fn();

    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        onToolChange={() => undefined}
        onPauseChange={onPauseChange}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole("button", { name: "暂停" }));
    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(onPauseChange).toHaveBeenCalledWith(true);
    expect(onClear).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: FAIL because `Toolbar` does not exist.

- [ ] **Step 3: Implement the toolbar**

Create `src/components/Toolbar.tsx`:

```tsx
import { Material } from "../simulation/materials";

type ToolbarProps = {
  tool: Material;
  paused: boolean;
  onToolChange: (tool: Material) => void;
  onPauseChange: (paused: boolean) => void;
  onClear: () => void;
};

export function Toolbar({
  tool,
  paused,
  onToolChange,
  onPauseChange,
  onClear,
}: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="沙盒工具">
      <button
        className="tool-button tool-button--sand"
        type="button"
        aria-pressed={tool === Material.Sand}
        onClick={() => onToolChange(Material.Sand)}
      >
        沙子
      </button>
      <button
        className="tool-button"
        type="button"
        aria-pressed={tool === Material.Empty}
        onClick={() => onToolChange(Material.Empty)}
      >
        橡皮
      </button>
      <button
        className="tool-button"
        type="button"
        onClick={() => onPauseChange(!paused)}
      >
        {paused ? "继续" : "暂停"}
      </button>
      <button className="tool-button" type="button" onClick={onClear}>
        清空
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: `2` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: add accessible sandbox toolbar"
```

## Task 7: Integrate Canvas Input And The Fixed-Step Loop

**Files:**
- Create: `src/canvas/SandboxCanvas.tsx`
- Create: `src/canvas/SandboxCanvas.test.tsx`

- [ ] **Step 1: Write failing pointer and pause tests**

Create `src/canvas/SandboxCanvas.test.tsx`:

```tsx
import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";
import { SandboxCanvas } from "./SandboxCanvas";

describe("SandboxCanvas", () => {
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        nextFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  });

  it("paints the selected material at the pointer position", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const { getByLabelText } = render(
      <SandboxCanvas
        tool={Material.Sand}
        paused={true}
        clearVersion={0}
        simulation={simulation}
      />,
    );
    const canvas = getByLabelText("像素沙盒");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(canvas, {
      clientX: 55,
      clientY: 55,
      pointerId: 1,
    });

    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
  });

  it("does not advance the simulation while paused", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);

    render(
      <SandboxCanvas
        tool={Material.Sand}
        paused={true}
        clearVersion={0}
        simulation={simulation}
      />,
    );

    act(() => {
      nextFrame?.(0);
      nextFrame?.(20);
    });

    expect(simulation.getCell(1, 1)).toBe(Material.Sand);
    expect(simulation.getCell(1, 2)).toBe(Material.Empty);
  });

  it("advances the simulation when running", () => {
    const simulation = new Simulation(3, 4, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);

    render(
      <SandboxCanvas
        tool={Material.Sand}
        paused={false}
        clearVersion={0}
        simulation={simulation}
      />,
    );

    act(() => {
      nextFrame?.(0);
      nextFrame?.(20);
    });

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
    expect(simulation.getCell(1, 2)).toBe(Material.Sand);
  });

  it("clears only when the clear version changes", () => {
    const simulation = new Simulation(3, 3, () => 0);
    simulation.paintCircle(1, 1, 0, Material.Sand);
    const { rerender } = render(
      <SandboxCanvas
        tool={Material.Sand}
        paused={true}
        clearVersion={0}
        simulation={simulation}
      />,
    );

    expect(simulation.getCell(1, 1)).toBe(Material.Sand);

    rerender(
      <SandboxCanvas
        tool={Material.Sand}
        paused={true}
        clearVersion={1}
        simulation={simulation}
      />,
    );

    expect(simulation.getCell(1, 1)).toBe(Material.Empty);
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
```

Expected: FAIL because `SandboxCanvas` does not exist.

- [ ] **Step 3: Implement Canvas rendering, input, cleanup, and fixed steps**

Create `src/canvas/SandboxCanvas.tsx`:

```tsx
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";
import {
  clientPointToGrid,
  interpolateGridLine,
  type GridPoint,
} from "./geometry";
import { renderSimulation } from "./renderSimulation";

const DEFAULT_GRID_SIZE = 160;
const BRUSH_RADIUS = 2;
const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 4;

type SandboxCanvasProps = {
  tool: Material;
  paused: boolean;
  clearVersion: number;
  simulation?: Simulation;
};

export function SandboxCanvas({
  tool,
  paused,
  clearVersion,
  simulation: providedSimulation,
}: SandboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const lastPointRef = useRef<GridPoint | null>(null);
  const lastClearVersionRef = useRef(clearVersion);

  if (simulationRef.current === null) {
    simulationRef.current =
      providedSimulation ??
      new Simulation(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE);
  }

  useEffect(() => {
    if (lastClearVersionRef.current === clearVersion) return;
    simulationRef.current?.clear();
    lastClearVersionRef.current = clearVersion;
  }, [clearVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !simulation || !context) return;

    const imageData = context.createImageData(
      simulation.width,
      simulation.height,
    );
    let frameId = 0;
    let previousTime: number | null = null;
    let accumulator = 0;

    const frame = (time: number) => {
      if (previousTime === null) previousTime = time;
      const elapsed = Math.min(time - previousTime, 100);
      previousTime = time;

      if (!paused && !document.hidden) {
        accumulator += elapsed;
        let steps = 0;
        while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
          simulation.step();
          accumulator -= STEP_MS;
          steps += 1;
        }
      } else {
        accumulator = 0;
      }

      renderSimulation(simulation, imageData);
      context.putImageData(imageData, 0, 0);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [paused]);

  const paintAtEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (!canvas || !simulation) return;

    const point = clientPointToGrid(
      canvas.getBoundingClientRect(),
      simulation.width,
      simulation.height,
      event.clientX,
      event.clientY,
    );
    if (!point) return;

    const points = lastPointRef.current
      ? interpolateGridLine(lastPointRef.current, point)
      : [point];
    for (const current of points) {
      simulation.paintCircle(
        current.x,
        current.y,
        BRUSH_RADIUS,
        tool,
      );
    }
    lastPointRef.current = point;
  };

  return (
    <canvas
      ref={canvasRef}
      className="sandbox-canvas"
      width={simulationRef.current.width}
      height={simulationRef.current.height}
      aria-label="像素沙盒"
      role="img"
      onPointerDown={(event) => {
        activePointerRef.current = event.pointerId;
        lastPointRef.current = null;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        paintAtEvent(event);
      }}
      onPointerMove={(event) => {
        if (activePointerRef.current !== event.pointerId) return;
        paintAtEvent(event);
      }}
      onPointerUp={(event) => {
        if (activePointerRef.current !== event.pointerId) return;
        activePointerRef.current = null;
        lastPointRef.current = null;
      }}
      onPointerCancel={() => {
        activePointerRef.current = null;
        lastPointRef.current = null;
      }}
    />
  );
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
```

Expected: `4` tests pass.

- [ ] **Step 5: Run all unit tests**

Run:

```bash
npm test
```

Expected: all simulation, geometry, renderer, toolbar, and canvas tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/SandboxCanvas.tsx src/canvas/SandboxCanvas.test.tsx
git commit -m "feat: connect canvas input and simulation loop"
```

## Task 8: Compose The App And Match The Warm-Paper Design

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Write the failing app smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the title, sandbox, and day one controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "像素炼金术" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("像素沙盒")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "沙子" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because `App` does not exist.

- [ ] **Step 3: Implement page composition**

Create `src/App.tsx`:

```tsx
import { useState } from "react";
import { SandboxCanvas } from "./canvas/SandboxCanvas";
import { Toolbar } from "./components/Toolbar";
import { Material } from "./simulation/materials";

export function App() {
  const [tool, setTool] = useState(Material.Sand);
  const [paused, setPaused] = useState(false);
  const [clearVersion, setClearVersion] = useState(0);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>像素炼金术</h1>
        <span className="experiment-label">试验 01</span>
      </header>

      <section className="sandbox-frame" aria-label="沙盒实验区">
        <SandboxCanvas
          tool={tool}
          paused={paused}
          clearVersion={clearVersion}
        />
      </section>

      <Toolbar
        tool={tool}
        paused={paused}
        onToolChange={setTool}
        onPauseChange={setPaused}
        onClear={() => setClearVersion((version) => version + 1)}
      />
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <meta
      name="description"
      content="一个可以绘制、暂停和擦除落沙的像素物理沙盒。"
    />
    <title>像素炼金术</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Add the approved warm-paper visual system**

Create `src/styles.css`:

```css
:root {
  font-family:
    "Songti SC", "STSong", "Noto Serif CJK SC", Georgia, serif;
  color: #3b3128;
  background: #eee7da;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
  background: #eee7da;
}

button {
  font: 700 0.95rem/1 system-ui, sans-serif;
}

.app-shell {
  width: min(100% - 24px, 760px);
  margin: 0 auto;
  padding: 24px 0 calc(24px + env(safe-area-inset-bottom));
}

.app-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
}

.app-header h1 {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2.5rem);
  line-height: 1;
  letter-spacing: 0.03em;
}

.experiment-label {
  flex: none;
  color: #887763;
  font: 700 0.75rem/1.2 ui-monospace, monospace;
  letter-spacing: 0.12em;
}

.sandbox-frame {
  padding: 8px;
  border: 2px solid #67594c;
  background: #d4c6b3;
  box-shadow: 6px 6px 0 #c8b79f;
}

.sandbox-canvas {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  background: #faf5ec;
  image-rendering: pixelated;
  touch-action: none;
  cursor: crosshair;
}

.toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.tool-button {
  min-height: 48px;
  padding: 0 10px;
  border: 1px solid #897a68;
  border-radius: 0;
  color: #453a2f;
  background: #f7f0e5;
  box-shadow: 3px 3px 0 #cdbba3;
  cursor: pointer;
}

.tool-button:hover {
  background: #fffaf1;
}

.tool-button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #cdbba3;
}

.tool-button[aria-pressed="true"] {
  border-width: 2px;
  border-color: #5f4932;
  background: #cf913b;
  color: #2f1b08;
  box-shadow: inset 0 -4px rgba(91, 52, 18, 0.16), 3px 3px 0 #a96e28;
}

.tool-button:focus-visible {
  outline: 3px solid #315f78;
  outline-offset: 3px;
}

@media (max-width: 520px) {
  .app-shell {
    width: min(100% - 16px, 440px);
    padding-top: 14px;
  }

  .app-header {
    align-items: flex-start;
  }

  .sandbox-frame {
    padding: 5px;
    box-shadow: 4px 4px 0 #c8b79f;
  }

  .toolbar {
    gap: 6px;
    margin-top: 12px;
  }

  .tool-button {
    min-height: 46px;
    padding-inline: 4px;
    font-size: 0.88rem;
  }
}

```

- [ ] **Step 5: Run app and unit tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite exit `0`, producing `dist/`.

- [ ] **Step 7: Commit**

```bash
git add index.html src/App.tsx src/App.test.tsx src/main.tsx src/styles.css
git commit -m "feat: compose warm paper sandbox"
```

## Task 9: Browser Verification And Visual Fidelity

**Files:**
- Modify as needed based on evidence: `src/styles.css`, `src/App.tsx`, `src/canvas/SandboxCanvas.tsx`

- [ ] **Step 1: Start the development server**

Run:

```bash
npm run dev
```

Expected: Vite serves `http://127.0.0.1:5173`.

- [ ] **Step 2: Verify desktop page health in Browser/IAB**

Check:

```text
URL: http://127.0.0.1:5173
Viewport: 1280x720
Title: 像素炼金术
DOM: heading, canvas, 沙子, 橡皮, 暂停, 清空 are visible
Console: no relevant error or warning
Overlay: no Vite or React error overlay
```

- [ ] **Step 3: Exercise the core interaction loop**

In the browser:

```text
1. Drag across the upper half of the canvas with 沙子 selected.
2. Observe the stroke become continuous amber pixels.
3. Observe the pixels fall and form a pile.
4. Click 暂停.
5. Confirm existing particles stop.
6. Draw another stroke while paused and confirm it stays in place.
7. Click 继续 and confirm the new stroke falls.
8. Select 橡皮 and drag through the pile.
9. Click 清空 and confirm no particles remain.
```

- [ ] **Step 4: Verify mobile layout**

Set viewport to `390 x 844` and confirm:

```text
- no horizontal overflow
- title and 试验 01 remain readable
- square canvas fits the viewport width
- all four controls are visible and at least 44px tall
- no control overlaps the canvas
- touch-style pointer drag paints continuously
```

- [ ] **Step 5: Capture implementation evidence**

Save current desktop and mobile screenshots outside the source tree:

```text
/tmp/pixel-alchemy-day-one-desktop.png
/tmp/pixel-alchemy-day-one-mobile.png
```

- [ ] **Step 6: Run the required visual comparison**

Use `view_image` on:

```text
docs/design/day-one-warm-paper-concept.png
/tmp/pixel-alchemy-day-one-desktop.png
/tmp/pixel-alchemy-day-one-mobile.png
```

Compare at least:

```text
1. Warm beige and warm-white palette
2. Header hierarchy and visible copy
3. Canvas dominance and square proportions
4. Deep-brown border and hard-edge shadow treatment
5. Bottom toolbar geometry and selected Sand state
6. Mobile spacing and control size
```

Fix every material mismatch that is feasible within the approved design.

- [ ] **Step 7: Re-run verification after visual fixes**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and build exits `0`.

Reload Browser/IAB and repeat console, desktop, mobile, and interaction checks.

- [ ] **Step 8: Commit verified fixes**

```bash
git add src
git commit -m "fix: polish day one sandbox experience"
```

Skip this commit only if browser verification required no file changes.

## Task 10: Final Completion Audit

**Files:**
- Read: `docs/superpowers/specs/2026-06-13-day-one-playable-sandbox-design.md`
- Read: all changed files

- [ ] **Step 1: Run fresh automated verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- all tests pass
- production build succeeds
- no unexplained generated or modified files remain

- [ ] **Step 2: Check the specification line by line**

Confirm evidence for:

```text
- sand falls, piles, and slides
- mouse and pointer drawing are continuous
- sand and eraser work
- pause/resume works
- pause still permits drawing
- clear works
- bottom toolbar matches the selected layout
- warm-paper visual direction is preserved
- desktop and 390x844 mobile layouts pass
- no special browser permissions are requested
- single-step, seed sharing, undo, extra materials, and backend remain out of scope
```

- [ ] **Step 3: Report completion with evidence**

Include:

```text
- test count and command
- production build command
- Browser/IAB desktop and mobile checks
- exact core interaction path exercised
- visual reference path and screenshot paths
- any intentional visual deviations
- remaining Day 2 scope
```
