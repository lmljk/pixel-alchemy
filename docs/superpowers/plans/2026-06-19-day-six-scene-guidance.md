# Day Six Scene Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add concise guidance for each example scene so new users know what reaction to observe.

**Architecture:** Store scene descriptions in `src/simulation/exampleScenes.ts`, then let `App` track the last selected scene and render an inline guidance card. Clearing the canvas resets that guidance.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Testing Library

---

## File Map

- Modify `src/simulation/exampleScenes.ts`: add `description` to `ExampleScene` and each item in `EXAMPLE_SCENES`.
- Modify `src/simulation/exampleScenes.test.ts`: verify stable descriptions.
- Modify `src/App.tsx`: track `activeSceneId`, render guidance, and clear it when the canvas is cleared.
- Modify `src/App.test.tsx`: verify no initial guidance, scene guidance after selection, and reset after clear.
- Modify `src/styles.css`: style the inline scene guidance card.
- Modify `README.md`: mention that examples include a short observation hint.

### Task 1: Scene Metadata

**Files:**
- Modify: `src/simulation/exampleScenes.ts`
- Modify: `src/simulation/exampleScenes.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/simulation/exampleScenes.test.ts`, extend the stable order test:

```ts
expect(EXAMPLE_SCENES.map((scene) => scene.description)).toEqual([
  "熔岩遇水会变成石头，并冒出蒸汽。",
  "酸液会咬掉墙和石头，自己也一起消失。",
  "植物吸收水后会向周围扩散。",
  "火会点燃油，火焰向上漂。",
]);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/simulation/exampleScenes.test.ts
```

Expected: FAIL because `description` is not defined on `ExampleScene`.

- [ ] **Step 3: Implement metadata**

In `src/simulation/exampleScenes.ts`, update the type:

```ts
export type ExampleScene = {
  id: ExampleSceneId;
  label: string;
  description: string;
};
```

Then update `EXAMPLE_SCENES`:

```ts
export const EXAMPLE_SCENES: readonly ExampleScene[] = [
  {
    id: "lavaWater",
    label: "熔岩遇水",
    description: "熔岩遇水会变成石头，并冒出蒸汽。",
  },
  {
    id: "acidCorrosion",
    label: "酸液腐蚀",
    description: "酸液会咬掉墙和石头，自己也一起消失。",
  },
  {
    id: "plantGrowth",
    label: "植物生长",
    description: "植物吸收水后会向周围扩散。",
  },
  {
    id: "oilFire",
    label: "油火反应",
    description: "火会点燃油，火焰向上漂。",
  },
] as const;
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
git commit -m "feat: describe example scenes"
```

### Task 2: App Guidance Card

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Write failing App tests**

In `src/App.test.tsx`, add:

```ts
it("hides scene guidance until an example is selected", () => {
  render(<App />);

  expect(screen.queryByText("当前示例：熔岩遇水")).not.toBeInTheDocument();
  expect(
    screen.queryByText("建议：点“单步”慢慢观察反应。"),
  ).not.toBeInTheDocument();
});

it("shows guidance for the selected example scene", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "熔岩遇水" }));

  expect(screen.getByText("当前示例：熔岩遇水")).toBeInTheDocument();
  expect(
    screen.getByText("熔岩遇水会变成石头，并冒出蒸汽。"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("建议：点“单步”慢慢观察反应。"),
  ).toBeInTheDocument();
});

it("clears scene guidance when the canvas is cleared", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "熔岩遇水" }));
  await user.click(screen.getByRole("button", { name: "清空" }));

  expect(screen.queryByText("当前示例：熔岩遇水")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because the guidance card is not rendered.

- [ ] **Step 3: Implement App state and card**

In `src/App.tsx`, change the scene import:

```ts
import {
  EXAMPLE_SCENES,
  applyExampleScene,
  type ExampleSceneId,
} from "./simulation/exampleScenes";
```

Add state and derived scene:

```ts
const [activeSceneId, setActiveSceneId] =
  useState<ExampleSceneId | null>(null);
const activeScene =
  activeSceneId === null
    ? undefined
    : EXAMPLE_SCENES.find((scene) => scene.id === activeSceneId);
```

Update handlers:

```ts
const handleExampleSceneSelect = (sceneId: ExampleSceneId) => {
  applyExampleScene(session.simulation, sceneId);
  setActiveSceneId(sceneId);
  setPaused(true);
};

const handleClear = () => {
  setActiveSceneId(null);
  setClearVersion((version) => version + 1);
};
```

Render the card after the sandbox frame:

```tsx
{activeScene && (
  <section className="scene-guidance" aria-label="示例说明">
    <p className="scene-guidance-title">
      当前示例：{activeScene.label}
    </p>
    <p>{activeScene.description}</p>
    <p>建议：点“单步”慢慢观察反应。</p>
  </section>
)}
```

Pass `handleClear` to `Toolbar`:

```tsx
onClear={handleClear}
```

- [ ] **Step 4: Add styles and README copy**

In `src/styles.css`, add:

```css
.scene-guidance {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid #897a68;
  color: #514538;
  background: #fff8ea;
  box-shadow: 3px 3px 0 #cdbba3;
  font: 600 0.88rem/1.4 system-ui, sans-serif;
}

.scene-guidance p {
  margin: 0;
}

.scene-guidance-title {
  color: #3f3328;
  font-weight: 800;
}
```

In `README.md`, update the example scene bullet:

```md
- 四个一键示例场景：熔岩遇水、酸液腐蚀、植物生长、油火反应，并附带观察提示
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css README.md
git commit -m "feat: show example scene guidance"
```

### Task 3: Final Verification

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

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short --branch
```

Expected: clean branch.
