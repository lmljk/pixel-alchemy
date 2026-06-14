# Day Two Material System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Day 1 sandbox from sand-only physics to eight drawable materials with deterministic movement, reactions, rendering, and a mobile-friendly material toolbar.

**Architecture:** Keep the existing `Uint8Array` simulation and Canvas render loop. Centralize material metadata in `materials.ts`, add a per-step processed bitmap to `Simulation`, implement explicit material handlers rather than a generic rule engine, and render/tool UI from the shared material catalog.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Canvas 2D.

---

## File Map

- Modify `src/simulation/materials.ts`: stable IDs, metadata, colors, categories, drawable order.
- Create `src/simulation/testRandom.ts`: deterministic sequence random helper for tests.
- Modify `src/simulation/Simulation.ts`: processed bitmap, solids, liquids, fire, plant reactions.
- Modify `src/simulation/Simulation.test.ts`: all material movement and reaction coverage.
- Modify `src/canvas/renderSimulation.ts`: catalog-driven material colors.
- Modify `src/canvas/renderSimulation.test.ts`: all materials and empty clearing.
- Modify `src/components/Toolbar.tsx`: scrollable material palette plus separate actions.
- Modify `src/components/Toolbar.test.tsx`: nine tools and action behavior.
- Modify `src/App.tsx`: Day 2 label and updated toolbar composition.
- Modify `src/App.test.tsx`: eight materials, eraser, actions, selected state.
- Modify `src/styles.css`: palette strip, material swatches, two-button action row.
- Read-only unless evidence requires fixes: `src/canvas/SandboxCanvas.tsx`.

## Task 1: Define The Material Catalog

**Files:**
- Modify: `src/simulation/materials.ts`
- Create: `src/simulation/materials.test.ts`
- Create: `src/simulation/testRandom.ts`
- Create: `src/simulation/testRandom.test.ts`

- [ ] **Step 1: Write failing material catalog tests**

Add tests asserting:

```ts
expect(DRAWABLE_MATERIALS.map(({ material }) => material)).toEqual([
  Material.Sand,
  Material.Water,
  Material.Wall,
  Material.Stone,
  Material.Wood,
  Material.Oil,
  Material.Fire,
  Material.Plant,
]);
expect(new Set(DRAWABLE_MATERIALS.map(({ material }) => material)).size).toBe(8);
expect(DRAWABLE_MATERIALS.every(({ label, colors }) =>
  label.length > 0 && colors.length > 0
)).toBe(true);
expect(getMaterialDefinition(Material.Wood).flammable).toBe(true);
expect(getMaterialDefinition(Material.Oil).flammable).toBe(true);
expect(getMaterialDefinition(Material.Plant).flammable).toBe(true);
expect(getMaterialDefinition(Material.Wall).flammable).toBe(false);
```

Add sequence random tests:

```ts
const random = sequenceRandom([0.2, 0.8]);
expect([random(), random(), random()]).toEqual([0.2, 0.8, 0.8]);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/simulation/materials.test.ts src/simulation/testRandom.test.ts
```

Expected: FAIL because the catalog and sequence helper do not exist.

- [ ] **Step 3: Implement stable material definitions**

Use these IDs:

```ts
export enum Material {
  Empty = 0,
  Sand = 1,
  Water = 2,
  Wall = 3,
  Stone = 4,
  Wood = 5,
  Oil = 6,
  Fire = 7,
  Plant = 8,
}
```

Define:

```ts
export type MaterialCategory =
  | "empty"
  | "powder"
  | "liquid"
  | "solid"
  | "reaction";

export type MaterialDefinition = {
  material: Material;
  label: string;
  cssName: string;
  category: MaterialCategory;
  flammable: boolean;
  colors: readonly (readonly [number, number, number])[];
};
```

Use these base color sets:

```ts
Sand: [[207,145,59], [217,157,70], [191,125,46]]
Water: [[62,132,168], [74,149,186], [48,112,151]]
Wall: [[91,79,68], [105,91,77]]
Stone: [[121,126,128], [143,146,145], [101,107,110]]
Wood: [[139,91,52], [157,105,61], [119,75,43]]
Oil: [[151,119,38], [171,137,47], [126,96,28]]
Fire: [[228,74,35], [242,112,33], [249,158,47]]
Plant: [[63,126,62], [77,145,72], [49,105,51]]
```

`getMaterialDefinition(Material.Empty)` must return a safe empty definition. Unknown numeric values must also return the empty definition.

- [ ] **Step 4: Implement sequence random**

```ts
export function sequenceRandom(values: readonly number[]): () => number {
  if (values.length === 0) return () => 0;
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/simulation/materials.test.ts src/simulation/testRandom.test.ts
npx tsc -b --pretty false
```

Expected: all new tests pass and TypeScript exits `0`.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/materials.ts src/simulation/materials.test.ts \
  src/simulation/testRandom.ts src/simulation/testRandom.test.ts
git commit -m "feat: define day two material catalog"
```

## Task 2: Add Step Processing And Static Materials

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing stone and wall tests**

Add:

```ts
it("keeps walls fixed", () => {
  const simulation = new Simulation(3, 4, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Wall);
  simulation.step();
  expect(simulation.getCell(1, 1)).toBe(Material.Wall);
});

it("moves stone only straight down", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Stone);
  simulation.step();
  expect(simulation.getCell(1, 2)).toBe(Material.Stone);
});

it("does not slide stone diagonally", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Stone);
  simulation.paintCircle(1, 2, 0, Material.Wall);
  simulation.step();
  expect(simulation.getCell(1, 1)).toBe(Material.Stone);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: stone and wall behavior tests fail.

- [ ] **Step 3: Add a processed bitmap and explicit dispatch**

Add `private readonly processed: Uint8Array` sized to the grid. At each `step()`:

```ts
this.processed.fill(0);
```

Skip processed cells. Dispatch:

```ts
switch (material) {
  case Material.Sand:
    this.stepSand(x, y);
    break;
  case Material.Stone:
    this.tryMove(x, y, x, y + 1);
    break;
  case Material.Wall:
  case Material.Wood:
  case Material.Plant:
    break;
}
```

`move()` must mark the destination as processed. Sand behavior must retain every Day 1 test.

- [ ] **Step 4: Prove moved particles are not processed twice**

Add a test with stone at `(1, 0)` in a `3 x 4` grid. After one step it must be at `(1, 1)`, not farther down.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: all existing and new simulation tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: add static and heavy solid materials"
```

## Task 3: Implement Water And Oil

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing liquid tests**

Cover:

```ts
// Water falls one cell.
// Water chooses down-left when down is blocked and random < 0.5.
// Water searches horizontally up to three cells when lower routes are blocked.
// Horizontal search stops at the first non-empty cell.
// Water swaps downward with oil.
// Oil does not swap downward with water.
// Oil falls and horizontally flows like water.
```

Use walls as supports and `sequenceRandom` for direction choices. Use a `7 x 3` grid for the horizontal range assertion.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: all liquid tests fail because Water and Oil have no handlers.

- [ ] **Step 3: Implement shared finite liquid movement**

Add:

```ts
private stepLiquid(
  x: number,
  y: number,
  material: Material.Water | Material.Oil,
): void
```

Order:

1. Water swaps with oil directly below.
2. Move down into empty.
3. Try diagonal empty cells in injected-random order.
4. Search the same row in the same priority order for distances `1..3`.
5. Stop a direction when out of bounds or the first non-empty cell is reached.

Use `tryMove` and a dedicated `swap` helper. Mark both swap destinations processed so neither liquid moves twice in the same step.

- [ ] **Step 4: Verify GREEN and regression**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
npm test
```

Expected: all simulation and project tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: add finite water and oil flow"
```

## Task 4: Implement Fire And Flammable Materials

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing ignition tests**

Add parameterized tests proving Wood, Oil, and Plant become Fire when a Fire cell is in their four-neighborhood. Also prove diagonal-only fire does not ignite.

Add a multiple-target test using `sequenceRandom([0.7, 0.9])` to prove one and only one flammable neighbor ignites.

- [ ] **Step 2: Write failing fire lifecycle tests**

Cover:

```ts
// fireRoll < 0.18 clears fire
// surviving fire moves upward into empty
// blocked fire uses fireRoll < 0.59 to prefer up-left
// blocked fire uses fireRoll >= 0.59 to prefer up-right
// fire moved or generated during the step does not move again
```

- [ ] **Step 3: Verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: ignition and fire movement tests fail.

- [ ] **Step 4: Implement four-neighbor reactions**

Add a reusable bounded four-neighbor collector with this stable order:

```ts
[
  { x, y: y - 1 },
  { x: x + 1, y },
  { x, y: y + 1 },
  { x: x - 1, y },
]
```

For Wood, Oil, and Plant, check adjacent Fire before normal behavior and convert the current cell to Fire.

For Fire:

1. Collect flammable neighbors.
2. If non-empty, use one random value to select `Math.floor(value * count)`, clamped to `count - 1`, and convert that neighbor to Fire.
3. Read `fireRoll`.
4. Clear when `< 0.18`.
5. Otherwise try up, then the two diagonals using the specified `0.59` split.

Mark newly ignited and moved cells processed.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
npx tsc -b --pretty false
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: add fire and ignition reactions"
```

## Task 5: Implement Plant Growth

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing plant tests**

Cover:

```ts
// Plant touching water consumes that water and creates one Plant.
// New Plant does not grow again during the same step.
// Plant with adjacent Fire becomes Fire and does not grow.
// Plant without adjacent water remains unchanged.
// Plant does not react to diagonal-only water.
```

Arrange the growth test so the selected water has exactly one adjacent empty target. Use walls to remove ambiguity.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: growth tests fail.

- [ ] **Step 3: Implement bounded one-step growth**

For each Plant:

1. Fire reaction already runs first.
2. Collect adjacent Water cells in stable four-neighbor order.
3. Use random only when more than one water candidate exists.
4. For the selected water, collect its empty four-neighbors excluding the source plant.
5. Use random only when more than one growth target exists.
6. Clear the water and create Plant at the chosen target.
7. Mark the new Plant processed.

If there is no valid empty target, leave both Plant and Water unchanged.

- [ ] **Step 4: Verify GREEN and all simulation behavior**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: all Day 1 and Day 2 simulation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: add water-fed plant growth"
```

## Task 6: Render Every Material

**Files:**
- Modify: `src/canvas/renderSimulation.ts`
- Modify: `src/canvas/renderSimulation.test.ts`

- [ ] **Step 1: Write failing material rendering tests**

For every `DRAWABLE_MATERIALS` entry:

1. Paint the material into index `1` of a `2 x 1` simulation.
2. Render.
3. Assert RGB equals `definition.colors[1 % definition.colors.length]`.
4. Assert alpha is `255`.

Retain the existing empty RGBA clearing regression.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/canvas/renderSimulation.test.ts
```

Expected: non-sand colors fail.

- [ ] **Step 3: Implement catalog-driven rendering**

Replace `SAND_COLORS` with:

```ts
const definition = getMaterialDefinition(material);
const color =
  definition.colors[
    (index + material) % definition.colors.length
  ];
```

Empty still clears all four channels. Unknown material values use the empty definition and render transparent.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- src/canvas/renderSimulation.test.ts
npm test
```

Expected: all renderer and project tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/renderSimulation.ts src/canvas/renderSimulation.test.ts
git commit -m "feat: render all day two materials"
```

## Task 7: Build The Material Palette Toolbar

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Write failing palette tests**

Assert:

```ts
for (const definition of DRAWABLE_MATERIALS) {
  expect(screen.getByRole("button", { name: definition.label }))
    .toBeInTheDocument();
}
expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
```

Click Water and expect `onToolChange(Material.Water)`. Render with Fire selected and assert only Fire has `aria-pressed="true"`. Retain pause/resume and clear tests.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: material buttons other than Sand are missing.

- [ ] **Step 3: Split palette and actions**

Render:

```tsx
<div className="sandbox-controls">
  <div
    className="material-palette"
    role="toolbar"
    aria-label="材料工具"
  >
    {DRAWABLE_MATERIALS.map(...)}
    <button aria-pressed={tool === Material.Empty}>橡皮</button>
  </div>
  <div className="simulation-actions" aria-label="模拟操作">
    <button>{paused ? "继续" : "暂停"}</button>
    <button>清空</button>
  </div>
</div>
```

Each material button includes:

```tsx
<span
  className="material-swatch"
  style={{ "--material-color": `rgb(${r} ${g} ${b})` } as CSSProperties}
  aria-hidden="true"
/>
<span>{label}</span>
```

Keep native buttons and `aria-pressed`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
npx tsc -b --pretty false
```

Expected: all Toolbar tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat: add scrollable material palette"
```

## Task 8: Compose Day Two UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing App tests**

Update the smoke test to require:

```ts
expect(screen.getByText("试验 02")).toBeInTheDocument();
for (const label of [
  "沙子", "水", "墙", "石头", "木头", "油", "火", "植物", "橡皮",
]) {
  expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
}
```

Click Oil and assert Oil selected. Retain pause-to-continue behavior.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: Day 2 label and materials are missing.

- [ ] **Step 3: Update App copy**

Change only the experiment label to `试验 02`; state wiring remains unchanged.

- [ ] **Step 4: Implement responsive palette styling**

Replace the four-column toolbar rules with:

```css
.sandbox-controls {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.material-palette {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 4px 6px 2px;
  scrollbar-width: thin;
}

.material-button {
  flex: 0 0 84px;
  min-height: 58px;
}

.material-swatch {
  display: block;
  width: 18px;
  height: 18px;
  margin: 0 auto 5px;
  border: 1px solid #67594c;
  background: var(--material-color);
}

.simulation-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
```

Keep the existing warm-paper palette, hard shadows, focus styles, and button height. At `max-width: 520px`, use `76px` palette buttons and `6px` gaps. Do not hide the scrollbar with unsupported tricks.

- [ ] **Step 5: Verify tests and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and Vite build exits `0`.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: compose day two material controls"
```

## Task 9: Browser Verification

**Files:**
- Modify only when browser evidence proves a defect.

- [ ] **Step 1: Start the app**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

- [ ] **Step 2: Verify desktop health**

Check URL, title, meaningful DOM, no Vite overlay, and no relevant console warnings/errors. Confirm all nine tool buttons and both actions are reachable.

- [ ] **Step 3: Exercise material behavior**

Perform:

1. Pause.
2. Draw a wall basin.
3. Draw water and oil in the basin.
4. Continue and confirm water settles below oil.
5. Pause and draw wood, plant, and oil near fire.
6. Continue and confirm ignition and eventual fire disappearance.
7. Pause and place plant adjacent to water with available space.
8. Continue and confirm growth.
9. Verify stone falls straight and sand forms a slope.
10. Select eraser and remove material.
11. Clear and confirm all pixels disappear.

- [ ] **Step 4: Verify `390 x 844`**

Confirm:

- document scroll width equals viewport width
- Canvas fits width
- palette scrolls horizontally
- all palette buttons are at least `44px` high
- action buttons stay visible without horizontal scrolling
- touch-style drag paints continuously

- [ ] **Step 5: Capture screenshots outside the repo**

Save:

```text
/tmp/pixel-alchemy-day-two-desktop.png
/tmp/pixel-alchemy-day-two-mobile.png
/tmp/pixel-alchemy-day-two-reactions.png
```

Use `view_image` to compare them with the Day 1 warm-paper concept. Preserve the established visual language rather than recreating the concept literally.

- [ ] **Step 6: Fix evidence-backed defects**

For every defect:

1. Add a failing unit test when the behavior is testable.
2. Apply the smallest fix.
3. Re-run the focused test.
4. Repeat browser verification.

Commit fixes as:

```bash
git add src
git commit -m "fix: polish day two material experience"
```

Skip this commit if no source changes are required.

## Task 10: Final Audit

**Files:**
- Read: `docs/superpowers/specs/2026-06-14-day-two-material-system-design.md`
- Read: all changed source and test files.

- [ ] **Step 1: Run fresh verification**

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: zero test failures, successful production build, no whitespace errors, clean worktree.

- [ ] **Step 2: Audit the specification**

Confirm evidence for:

- eight drawable materials
- eraser, pause/resume, and clear retained
- water and oil finite flow and layering
- wall and wood static behavior
- stone vertical-only fall
- fire ignition, rise, and extinction
- plant water-fed growth
- no same-step repeated movement or growth
- deterministic tests via injected random sequences
- catalog-driven renderer and toolbar
- desktop and mobile layout
- no network, permissions, backend, single-step, or seed sharing

- [ ] **Step 3: Report completion**

Include:

- test count and commands
- build command
- exact browser interaction path
- desktop/mobile dimensions
- screenshot paths
- any intentional deviations
- remaining Day 3 scope: single-step and seeded sharing
