# Day Six Playtest Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a brush-size slider and one-click example scenes so the sandbox is easier to try immediately.

**Architecture:** Keep simulation rules unchanged. Add reusable scene setup functions in `src/simulation/exampleScenes.ts`, pass `brushRadius` from `App` to `SandboxCanvas`, and extend `Toolbar` with a range input plus scene buttons.

**Tech Stack:** React 19, TypeScript 6, Canvas 2D, Vite, Vitest, Testing Library

---

## File Map

- Create `src/simulation/exampleScenes.ts`: scene IDs, labels, and `applyExampleScene`.
- Create `src/simulation/exampleScenes.test.ts`: scene clearing and material placement tests.
- Modify `src/canvas/SandboxCanvas.tsx`: accept `brushRadius` prop and use it for pointer and keyboard painting.
- Modify `src/canvas/SandboxCanvas.test.tsx`: prove custom radius is passed to `paintCircle`.
- Modify `src/components/Toolbar.tsx`: add brush slider and example-scene controls.
- Modify `src/components/Toolbar.test.tsx`: test slider and scene button callbacks.
- Modify `src/App.tsx`: hold `brushRadius`, load scenes, update intro and label to `试验 06`.
- Modify `src/App.test.tsx`: test day-six copy, slider, and scene pause behavior.
- Modify `src/styles.css`: responsive controls for brush and scene groups.
- Modify `README.md`: add playtest suggestions.

### Task 1: Example Scene Module

**Files:**
- Create: `src/simulation/exampleScenes.ts`
- Create: `src/simulation/exampleScenes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/simulation/exampleScenes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EXAMPLE_SCENES,
  applyExampleScene,
  type ExampleSceneId,
} from "./exampleScenes";
import { Material } from "./materials";
import { Simulation } from "./Simulation";

function materialCount(simulation: Simulation, material: Material): number {
  return Array.from(simulation.cells).filter((cell) => cell === material).length;
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
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/exampleScenes.test.ts
```

Expected: FAIL because `exampleScenes.ts` does not exist.

- [ ] **Step 3: Implement scene module**

Create `src/simulation/exampleScenes.ts`:

```ts
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
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/exampleScenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/exampleScenes.ts src/simulation/exampleScenes.test.ts
git commit -m "feat: add playtest example scenes"
```

### Task 2: Brush Radius In Canvas

**Files:**
- Modify: `src/canvas/SandboxCanvas.tsx`
- Modify: `src/canvas/SandboxCanvas.test.tsx`

- [ ] **Step 1: Write failing radius test**

In `src/canvas/SandboxCanvas.test.tsx`, add:

```ts
it("uses the provided brush radius for pointer and keyboard painting", () => {
  const simulation = new Simulation(10, 10, () => 0);
  const paintCircle = vi.spyOn(simulation, "paintCircle");
  render(
    <SandboxCanvas
      simulation={simulation}
      tool={Material.Sand}
      paused
      clearVersion={0}
      stepVersion={0}
      brushRadius={5}
    />,
  );
  const canvas = screen.getByRole("application", {
    name: "像素沙盒",
  }) as HTMLCanvasElement;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    toJSON: () => ({}),
  });

  fireEvent.pointerDown(canvas, {
    clientX: 55,
    clientY: 55,
    pointerId: 7,
  });
  expect(paintCircle).toHaveBeenLastCalledWith(5, 5, 5, Material.Sand);

  canvas.focus();
  fireEvent.keyDown(canvas, { key: "Enter" });
  expect(paintCircle).toHaveBeenLastCalledWith(5, 5, 5, Material.Sand);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
```

Expected: FAIL because `brushRadius` is not a supported prop and fixed radius `2` is used.

- [ ] **Step 3: Implement brush radius prop**

In `src/canvas/SandboxCanvas.tsx`:

```ts
const DEFAULT_BRUSH_RADIUS = 2;

interface SandboxCanvasProps {
  tool: Material;
  paused: boolean;
  clearVersion: number;
  stepVersion: number;
  brushRadius?: number;
  simulation?: Simulation;
}
```

Destructure with default:

```ts
brushRadius = DEFAULT_BRUSH_RADIUS,
```

Use it in `paintPoint`:

```ts
activeSimulation.paintCircle(point.x, point.y, brushRadius, tool);
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/SandboxCanvas.tsx src/canvas/SandboxCanvas.test.tsx
git commit -m "feat: support adjustable brush radius"
```

### Task 3: Toolbar Controls

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Toolbar.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing Toolbar tests**

In `src/components/Toolbar.test.tsx`, import `fireEvent` and `EXAMPLE_SCENES`, then add:

```ts
it("renders a brush radius slider and reports changes", () => {
  const onBrushRadiusChange = vi.fn();
  render(
    <Toolbar
      tool={Material.Sand}
      paused={false}
      brushRadius={2}
      onBrushRadiusChange={onBrushRadiusChange}
      onExampleSceneSelect={vi.fn()}
      onToolChange={vi.fn()}
      onPauseChange={vi.fn()}
      onClear={vi.fn()}
      onStep={vi.fn()}
      onShare={vi.fn()}
      shareStatus="idle"
    />,
  );

  const slider = screen.getByRole("slider", { name: "笔刷大小" });
  expect(slider).toHaveAttribute("min", "1");
  expect(slider).toHaveAttribute("max", "8");
  expect(slider).toHaveValue("2");
  expect(screen.getByText("笔刷 2")).toBeInTheDocument();

  fireEvent.change(slider, { target: { value: "6" } });
  expect(onBrushRadiusChange).toHaveBeenCalledWith(6);
});

it("renders example scene buttons and reports selection", async () => {
  const user = userEvent.setup();
  const onExampleSceneSelect = vi.fn();
  render(
    <Toolbar
      tool={Material.Sand}
      paused={false}
      brushRadius={2}
      onBrushRadiusChange={vi.fn()}
      onExampleSceneSelect={onExampleSceneSelect}
      onToolChange={vi.fn()}
      onPauseChange={vi.fn()}
      onClear={vi.fn()}
      onStep={vi.fn()}
      onShare={vi.fn()}
      shareStatus="idle"
    />,
  );

  for (const scene of EXAMPLE_SCENES) {
    expect(screen.getByRole("button", { name: scene.label })).toBeInTheDocument();
  }

  await user.click(screen.getByRole("button", { name: "酸液腐蚀" }));
  expect(onExampleSceneSelect).toHaveBeenCalledWith("acidCorrosion");
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: FAIL because Toolbar has no brush slider or scene controls.

- [ ] **Step 3: Implement Toolbar controls**

Add props:

```ts
import {
  EXAMPLE_SCENES,
  type ExampleSceneId,
} from "../simulation/exampleScenes";

type ToolbarProps = {
  tool: Material;
  paused: boolean;
  brushRadius?: number;
  onBrushRadiusChange?: (radius: number) => void;
  onExampleSceneSelect?: (sceneId: ExampleSceneId) => void;
  onToolChange: (tool: Material) => void;
  onPauseChange: (paused: boolean) => void;
  onClear: () => void;
  onStep: () => void;
  onShare: () => void;
  shareStatus: ShareStatus;
};
```

Default optional handlers to no-ops and render:

```tsx
<div className="playtest-controls">
  <div className="brush-control" role="group" aria-label="笔刷设置">
    <label htmlFor="brush-radius">笔刷 {brushRadius}</label>
    <input
      id="brush-radius"
      className="brush-slider"
      type="range"
      min="1"
      max="8"
      value={brushRadius}
      aria-label="笔刷大小"
      onChange={(event) =>
        onBrushRadiusChange(Number(event.currentTarget.value))
      }
    />
  </div>
  <div className="example-scenes" role="group" aria-label="示例场景">
    {EXAMPLE_SCENES.map((scene) => (
      <button
        key={scene.id}
        className="tool-button scene-button"
        type="button"
        onClick={() => onExampleSceneSelect(scene.id)}
      >
        {scene.label}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Style controls**

Add responsive CSS:

```css
.playtest-controls {
  display: grid;
  gap: 8px;
}

.brush-control {
  display: grid;
  grid-template-columns: auto minmax(140px, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #897a68;
  background: #f7f0e5;
  box-shadow: 3px 3px 0 #cdbba3;
  font: 700 0.9rem/1 system-ui, sans-serif;
}

.brush-slider {
  width: 100%;
  accent-color: #cf913b;
}

.example-scenes {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
```

In the mobile query:

```css
.brush-control {
  grid-template-columns: 1fr;
}

.example-scenes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx src/styles.css
git commit -m "feat: add playtest toolbar controls"
```

### Task 4: App Integration And README

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Write failing App tests**

Update the first App test for `试验 06` and playtest copy:

```ts
expect(screen.getByText("试验 06")).toBeInTheDocument();
expect(
  screen.getByText("选择材料，在画布上绘制；拖动笔刷滑块快速铺材料。"),
).toBeInTheDocument();
expect(
  screen.getByText("不会搭配时，可以先加载示例场景，再用单步观察反应。"),
).toBeInTheDocument();
expect(screen.getByRole("slider", { name: "笔刷大小" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "熔岩遇水" })).toBeInTheDocument();
```

Add:

```ts
it("loads an example scene paused", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "熔岩遇水" }));

  expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because App still shows day five copy and does not wire controls.

- [ ] **Step 3: Implement App state and copy**

In `src/App.tsx`, import scene helpers, add `brushRadius` state, add `handleExampleSceneSelect`, pass props to `SandboxCanvas` and `Toolbar`, and update label/copy to day six.

- [ ] **Step 4: Update README**

Add:

```md
## 试玩建议

- 不知道从哪里开始时，先点一个示例场景。
- 暂停后点击“单步”，可以慢慢观察材料反应。
- 拖动笔刷滑块铺地形或补细节。
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx README.md
git commit -m "feat: wire playtest tools into app"
```

### Task 5: Full Verification And Browser QA

**Files:**
- No planned code changes.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Browser smoke test**

Start:

```bash
npm run dev -- --host 127.0.0.1
```

Verify:

```text
The page shows 试验 06, brush slider, and four scene buttons.
Selecting a scene changes the pause button to 继续.
At 390 x 844 there is no whole-page horizontal overflow.
The browser console has no app errors.
```

