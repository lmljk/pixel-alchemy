# Day Four Steam Lava Acid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add steam, lava, and acid to the playable pixel sandbox, including deterministic simulation rules, rendering, toolbar selection, and `v2` share links.

**Architecture:** Keep the existing single-grid `Simulation` model and add three local material handlers. Material metadata remains centralized in `materials.ts`, rendering continues to read from that catalog, and the share codec keeps the existing 10-byte header while bumping the format version to `2`.

**Tech Stack:** React 19, TypeScript 6, Canvas 2D, Vite, Vitest, Testing Library

---

## File Map

- Modify `src/simulation/materials.ts`: add `Steam`, `Lava`, and `Acid` enum values plus catalog metadata and colors.
- Modify `src/simulation/materials.test.ts`: lock material numbering, drawable order, and flammability.
- Modify `src/canvas/renderSimulation.test.ts`: confirm new materials render through the shared catalog.
- Modify `src/sharing/shareState.ts`: bump share version to `2` and allow material IDs through `Material.Acid`.
- Modify `src/sharing/shareState.test.ts`: cover `v2`, new materials, old `v1` rejection, and invalid material `12`.
- Modify `src/simulation/Simulation.ts`: add steam, lava, and acid dispatch and rule handlers.
- Modify `src/simulation/Simulation.test.ts`: add deterministic behavior tests for the three new materials.
- Modify `src/components/Toolbar.test.tsx`: assert new buttons appear and can be selected.
- Modify `src/App.tsx`: update experiment label to “试验 04”.
- Modify `src/App.test.tsx`: update the top-level app expectation and valid share fixture to include new format.

### Task 1: Material Catalog And Rendering

**Files:**
- Modify: `src/simulation/materials.ts`
- Modify: `src/simulation/materials.test.ts`
- Modify: `src/canvas/renderSimulation.test.ts`

- [ ] **Step 1: Write failing material catalog tests**

Update the stable order test in `src/simulation/materials.test.ts`:

```ts
it("keeps the eleven drawable materials in a stable order", () => {
  expect(Material.Steam).toBe(9);
  expect(Material.Lava).toBe(10);
  expect(Material.Acid).toBe(11);
  expect(
    DRAWABLE_MATERIALS.map(({ material }) => material),
  ).toEqual([
    Material.Sand,
    Material.Water,
    Material.Wall,
    Material.Stone,
    Material.Wood,
    Material.Oil,
    Material.Fire,
    Material.Plant,
    Material.Steam,
    Material.Lava,
    Material.Acid,
  ]);
  expect(
    new Set(DRAWABLE_MATERIALS.map(({ material }) => material)).size,
  ).toBe(11);
});
```

Extend the flammability test:

```ts
it("marks only the intended materials as flammable", () => {
  expect(getMaterialDefinition(Material.Wood).flammable).toBe(true);
  expect(getMaterialDefinition(Material.Oil).flammable).toBe(true);
  expect(getMaterialDefinition(Material.Plant).flammable).toBe(true);
  expect(getMaterialDefinition(Material.Wall).flammable).toBe(false);
  expect(getMaterialDefinition(Material.Steam).flammable).toBe(false);
  expect(getMaterialDefinition(Material.Lava).flammable).toBe(false);
  expect(getMaterialDefinition(Material.Acid).flammable).toBe(false);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/materials.test.ts src/canvas/renderSimulation.test.ts
```

Expected: FAIL because `Material.Steam`, `Material.Lava`, and `Material.Acid` do not exist.

- [ ] **Step 3: Add material definitions**

Update `src/simulation/materials.ts`:

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
  Steam = 9,
  Lava = 10,
  Acid = 11,
}

export type MaterialCategory =
  | "empty"
  | "powder"
  | "liquid"
  | "solid"
  | "gas"
  | "reaction";
```

Append these catalog entries after `Material.Plant`:

```ts
{
  material: Material.Steam,
  label: "蒸汽",
  cssName: "steam",
  category: "gas",
  flammable: false,
  colors: [
    [196, 220, 225],
    [225, 238, 238],
    [174, 205, 216],
  ],
},
{
  material: Material.Lava,
  label: "熔岩",
  cssName: "lava",
  category: "liquid",
  flammable: false,
  colors: [
    [204, 58, 38],
    [236, 96, 31],
    [255, 168, 55],
  ],
},
{
  material: Material.Acid,
  label: "酸液",
  cssName: "acid",
  category: "liquid",
  flammable: false,
  colors: [
    [135, 205, 51],
    [175, 232, 66],
    [91, 168, 47],
  ],
},
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/materials.test.ts src/canvas/renderSimulation.test.ts
```

Expected: PASS. The existing `renderSimulation` parametrized test should now cover all eleven drawable materials because it iterates `DRAWABLE_MATERIALS`.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/materials.ts src/simulation/materials.test.ts src/canvas/renderSimulation.test.ts
git commit -m "feat: add day four material catalog"
```

### Task 2: Share Format V2

**Files:**
- Modify: `src/sharing/shareState.ts`
- Modify: `src/sharing/shareState.test.ts`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing share tests**

In `src/sharing/shareState.test.ts`, update the mixed round-trip fixture:

```ts
const state: SharedState = {
  width: 4,
  height: 2,
  cells: new Uint8Array([
    Material.Sand,
    Material.Water,
    Material.Steam,
    Material.Lava,
    Material.Acid,
    Material.Empty,
    Material.Fire,
    Material.Plant,
  ]),
  randomState: 0xfedcba98,
  scanLeftToRight: false,
};

expect(decodeShareState(encodeShareState(state))).toEqual(state);
expect(payloadBytes(encodeShareState(state))[0]).toBe(2);
```

Replace the first malformed mutation so old `v1` is explicitly rejected:

```ts
mutatePayload(validPayload, (bytes) => {
  bytes[0] = 1;
}),
```

Add an invalid material check:

```ts
it("rejects material IDs above acid", () => {
  const payload = encodeShareState(validState);
  const invalidMaterial = mutatePayload(payload, (bytes) => {
    bytes[10] = Material.Acid + 1;
  });

  expect(() => decodeShareState(invalidMaterial)).toThrow(
    "Unknown material",
  );
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/sharing/shareState.test.ts src/App.test.tsx
```

Expected: FAIL because share payloads still encode version `1` and reject materials above `Material.Plant`.

- [ ] **Step 3: Implement format bump**

In `src/sharing/shareState.ts`, change:

```ts
const FORMAT_VERSION = 2;
```

Update material validation:

```ts
function validateMaterial(material: number): Material {
  if (
    !Number.isInteger(material) ||
    material < Material.Empty ||
    material > Material.Acid
  ) {
    throw new Error(`Unknown material: ${material}`);
  }
  return material as Material;
}
```

- [ ] **Step 4: Update app share fixtures**

In `src/App.test.tsx`, keep using `encodeShareState` for valid share payloads. After Task 2, these fixtures automatically become version `2`. No hand-authored `v1` payload should remain in app tests.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/sharing/shareState.test.ts src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sharing/shareState.ts src/sharing/shareState.test.ts src/App.test.tsx
git commit -m "feat: upgrade share format for day four materials"
```

### Task 3: Steam Simulation Rule

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing steam tests**

Add these tests to `src/simulation/Simulation.test.ts`:

```ts
it("moves steam upward when it does not condense", () => {
  const simulation = new Simulation(3, 3, () => 0.9);
  simulation.paintCircle(1, 1, 0, Material.Steam);

  simulation.step();

  expect(simulation.getCell(1, 0)).toBe(Material.Steam);
  expect(simulation.getCell(1, 1)).toBe(Material.Empty);
});

it("condenses steam into water without moving the water in the same step", () => {
  const simulation = new Simulation(3, 3, () => 0.05);
  simulation.paintCircle(1, 1, 0, Material.Steam);

  simulation.step();

  expect(simulation.getCell(1, 1)).toBe(Material.Water);
  expect(simulation.getCell(1, 2)).toBe(Material.Empty);
});

it("moves blocked steam up-left for a low roll", () => {
  const simulation = new Simulation(3, 3, () => 0.2);
  simulation.paintCircle(1, 1, 0, Material.Steam);
  simulation.paintCircle(1, 0, 0, Material.Wall);

  simulation.step();

  expect(simulation.getCell(0, 0)).toBe(Material.Steam);
});

it("moves blocked steam up-right for a high roll", () => {
  const simulation = new Simulation(3, 3, () => 0.8);
  simulation.paintCircle(1, 1, 0, Material.Steam);
  simulation.paintCircle(1, 0, 0, Material.Wall);

  simulation.step();

  expect(simulation.getCell(2, 0)).toBe(Material.Steam);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because `Simulation.step()` does not dispatch `Material.Steam`.

- [ ] **Step 3: Implement steam dispatch and handler**

Add a case in `Simulation.step()`:

```ts
case Material.Steam:
  this.stepSteam(x, y);
  break;
```

Add the handler:

```ts
private stepSteam(x: number, y: number): void {
  const steamRoll = this.random();
  if (steamRoll < 0.08) {
    this.setMaterial(x, y, Material.Water);
    return;
  }

  if (this.tryMove(x, y, x, y - 1)) return;

  const offsets = steamRoll < 0.54 ? [-1, 1] : [1, -1];
  for (const offset of offsets) {
    if (this.tryMove(x, y, x + offset, y - 1)) return;
  }
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: simulate steam"
```

### Task 4: Lava Simulation Rule

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing lava tests**

Add these tests:

```ts
it("turns lava into stone and neighboring water into steam", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Lava);
  simulation.paintCircle(1, 0, 0, Material.Water);

  simulation.step();

  expect(simulation.getCell(1, 1)).toBe(Material.Stone);
  expect(simulation.getCell(1, 0)).toBe(Material.Steam);
});

it.each([
  ["wood", Material.Wood],
  ["oil", Material.Oil],
  ["plant", Material.Plant],
])("lets lava ignite neighboring %s", (_name, material) => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Lava);
  simulation.paintCircle(1, 0, 0, material);

  simulation.step();

  expect(simulation.getCell(1, 0)).toBe(Material.Fire);
  expect(simulation.getCell(1, 1)).toBe(Material.Lava);
});

it("keeps lava still when the slow movement roll is high", () => {
  const simulation = new Simulation(3, 3, () => 0.9);
  simulation.paintCircle(1, 1, 0, Material.Lava);

  simulation.step();

  expect(simulation.getCell(1, 1)).toBe(Material.Lava);
  expect(simulation.getCell(1, 2)).toBe(Material.Empty);
});

it("lets lava flow when the slow movement roll is low", () => {
  const simulation = new Simulation(3, 3, () => 0.1);
  simulation.paintCircle(1, 1, 0, Material.Lava);

  simulation.step();

  expect(simulation.getCell(1, 2)).toBe(Material.Lava);
  expect(simulation.getCell(1, 1)).toBe(Material.Empty);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because lava is not dispatched.

- [ ] **Step 3: Generalize liquid movement for lava and acid**

Change the material union accepted by `stepLiquid`:

```ts
private stepLiquid(
  x: number,
  y: number,
  material: Material.Water | Material.Oil | Material.Lava | Material.Acid,
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
```

- [ ] **Step 4: Implement lava dispatch and handler**

Add a case in `Simulation.step()`:

```ts
case Material.Lava:
  this.stepLava(x, y);
  break;
```

Add the handler:

```ts
private stepLava(x: number, y: number): void {
  const water = this.choosePoint(
    this.neighbors4(x, y).filter(
      (point) => this.getCell(point.x, point.y) === Material.Water,
    ),
  );
  if (water) {
    this.setMaterial(water.x, water.y, Material.Steam);
    this.setMaterial(x, y, Material.Stone);
    return;
  }

  const flammable = this.choosePoint(
    this.neighbors4(x, y).filter(({ x: neighborX, y: neighborY }) => {
      const material = this.getCell(neighborX, neighborY);
      return (
        material === Material.Wood ||
        material === Material.Oil ||
        material === Material.Plant
      );
    }),
  );
  if (flammable) {
    this.setMaterial(flammable.x, flammable.y, Material.Fire);
    return;
  }

  if (this.random() >= 0.35) return;
  this.stepLiquid(x, y, Material.Lava);
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: simulate lava"
```

### Task 5: Acid Simulation Rule

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing acid tests**

Add these tests:

```ts
it.each([
  ["wall", Material.Wall],
  ["stone", Material.Stone],
  ["wood", Material.Wood],
  ["plant", Material.Plant],
])("lets acid corrode %s and disappear", (_name, material) => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Acid);
  simulation.paintCircle(1, 0, 0, material);

  simulation.step();

  expect(simulation.getCell(1, 1)).toBe(Material.Empty);
  expect(simulation.getCell(1, 0)).toBe(Material.Empty);
});

it.each([
  ["sand", Material.Sand],
  ["water", Material.Water],
  ["oil", Material.Oil],
  ["fire", Material.Fire],
  ["steam", Material.Steam],
  ["lava", Material.Lava],
  ["acid", Material.Acid],
])("does not let acid corrode %s", (_name, material) => {
  const simulation = new Simulation(3, 3, () => 0.9);
  simulation.paintCircle(1, 1, 0, Material.Acid);
  simulation.paintCircle(1, 0, 0, material);
  simulation.paintCircle(0, 0, 0, Material.Sand);
  simulation.paintCircle(2, 0, 0, Material.Sand);
  simulation.paintCircle(0, 1, 0, Material.Sand);
  simulation.paintCircle(2, 1, 0, Material.Sand);
  simulation.paintCircle(0, 2, 0, Material.Sand);
  simulation.paintCircle(1, 2, 0, Material.Sand);
  simulation.paintCircle(2, 2, 0, Material.Sand);

  simulation.step();

  expect(simulation.getCell(1, 0)).toBe(material);
  expect(simulation.getCell(1, 1)).toBe(Material.Acid);
});

it("lets acid flow like a liquid when there is nothing to corrode", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Acid);

  simulation.step();

  expect(simulation.getCell(1, 2)).toBe(Material.Acid);
  expect(simulation.getCell(1, 1)).toBe(Material.Empty);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because acid is not dispatched.

- [ ] **Step 3: Implement acid dispatch and handler**

Add a case in `Simulation.step()`:

```ts
case Material.Acid:
  this.stepAcid(x, y);
  break;
```

Add the handler:

```ts
private stepAcid(x: number, y: number): void {
  const target = this.choosePoint(
    this.neighbors4(x, y).filter(({ x: neighborX, y: neighborY }) => {
      const material = this.getCell(neighborX, neighborY);
      return (
        material === Material.Wall ||
        material === Material.Stone ||
        material === Material.Wood ||
        material === Material.Plant
      );
    }),
  );

  if (target) {
    this.setMaterial(target.x, target.y, Material.Empty);
    this.setMaterial(x, y, Material.Empty);
    return;
  }

  this.stepLiquid(x, y, Material.Acid);
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: simulate acid"
```

### Task 6: App And Toolbar UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Write failing UI tests**

In `src/App.test.tsx`, rename the top-level test and update the label expectation:

```ts
it("renders the title, sandbox, and day four controls", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: "像素炼金术" }),
  ).toBeInTheDocument();
  expect(screen.getByText("试验 04")).toBeInTheDocument();
  expect(screen.getByLabelText("像素沙盒")).toBeInTheDocument();
  for (const definition of DRAWABLE_MATERIALS) {
    expect(
      screen.getByRole("button", { name: definition.label }),
    ).toBeInTheDocument();
  }
  expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument();
});
```

Add a toolbar selection test:

```ts
it("selects the day four materials from the material palette", async () => {
  const user = userEvent.setup();
  const onToolChange = vi.fn();

  render(
    <Toolbar
      tool={Material.Sand}
      paused={false}
      onToolChange={onToolChange}
      onPauseChange={vi.fn()}
      onClear={vi.fn()}
      onStep={vi.fn()}
      onShare={vi.fn()}
      shareStatus="idle"
    />,
  );

  await user.click(screen.getByRole("button", { name: "蒸汽" }));
  await user.click(screen.getByRole("button", { name: "熔岩" }));
  await user.click(screen.getByRole("button", { name: "酸液" }));

  expect(onToolChange).toHaveBeenNthCalledWith(1, Material.Steam);
  expect(onToolChange).toHaveBeenNthCalledWith(2, Material.Lava);
  expect(onToolChange).toHaveBeenNthCalledWith(3, Material.Acid);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/App.test.tsx src/components/Toolbar.test.tsx
```

Expected: FAIL because the app still displays “试验 03”. Toolbar selection may already pass after Task 1 because it maps `DRAWABLE_MATERIALS`.

- [ ] **Step 3: Update app label**

In `src/App.tsx`, change:

```tsx
<span className="experiment-label">试验 04</span>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/App.test.tsx src/components/Toolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/Toolbar.test.tsx
git commit -m "feat: expose day four materials in the app"
```

### Task 7: Full Verification And Browser QA

**Files:**
- No code files expected.
- Use browser verification against the local Vite app.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS for all test files.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 3: Start the local demo server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite serves the app on a localhost URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 4: Browser smoke test desktop**

Open the local URL in the in-app browser and verify:

```text
The page shows 像素炼金术 and 试验 04.
The toolbar includes 蒸汽, 熔岩, 酸液, 橡皮, 暂停, 单步, 清空, 分享.
Clicking 蒸汽, 熔岩, and 酸液 visibly selects each button.
The console has no app errors.
```

- [ ] **Step 5: Browser smoke test mobile viewport**

Set viewport to `390 x 844` and verify:

```text
The page does not create whole-page horizontal overflow.
The material palette scrolls horizontally.
The action buttons remain reachable.
```

- [ ] **Step 6: Manual interaction smoke test**

With the simulation paused:

```text
Draw water above lava and single-step until a steam pixel and stone pixel are visible.
Draw acid next to wall and single-step; both pixels disappear.
Draw steam and single-step; it rises or condenses depending on the random roll.
Click 分享 on localhost and confirm the button reports 已复制 or, if clipboard is denied, 复制失败 without crashing.
```

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short --branch
```

Expected: clean working tree on `codex/day-four-materials`, except ignored `dist/` or `node_modules/` if present.
