# Day Three Step And Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pause-only single stepping and versioned URL snapshots that restore the full grid, PRNG state, and simulation scan direction.

**Architecture:** `App` owns one `Simulation` and one stateful `SeededRandom`. `Simulation` exposes immutable snapshots and restoration, while a pure sharing codec serializes those snapshots into validated base64url RLE payloads. `SandboxCanvas` receives version counters for clear and single-step commands; `Toolbar` remains a presentational control surface.

**Tech Stack:** React 19, TypeScript 6, Canvas 2D, Vitest, Testing Library, Vite

---

## File Map

- Create `src/simulation/SeededRandom.ts`: stateful deterministic PRNG and initial seed generation.
- Create `src/simulation/SeededRandom.test.ts`: PRNG sequence and state restoration tests.
- Modify `src/simulation/Simulation.ts`: immutable snapshot and restore APIs including scan direction.
- Modify `src/simulation/Simulation.test.ts`: snapshot isolation and deterministic restoration tests.
- Create `src/sharing/shareState.ts`: binary RLE codec, hash parser, and share URL builder.
- Create `src/sharing/shareState.test.ts`: codec round trips and malformed payload rejection.
- Modify `src/canvas/SandboxCanvas.tsx`: pause-only single-step version handling.
- Modify `src/canvas/SandboxCanvas.test.tsx`: exact single-step behavior tests.
- Modify `src/components/Toolbar.tsx`: single-step and share controls with accessible status.
- Modify `src/components/Toolbar.test.tsx`: control state and callback tests.
- Modify `src/App.tsx`: session initialization, restoration, clipboard sharing, and feedback timer.
- Modify `src/App.test.tsx`: restored-session, clipboard success, and clipboard failure tests.
- Modify `src/styles.css`: four-button responsive action layout, disabled state, and status styling.

### Task 1: Deterministic Random Source

**Files:**
- Create: `src/simulation/SeededRandom.ts`
- Create: `src/simulation/SeededRandom.test.ts`

- [ ] **Step 1: Write failing PRNG tests**

```ts
import { describe, expect, it } from "vitest";
import { SeededRandom } from "./SeededRandom";

describe("SeededRandom", () => {
  it("produces the same sequence from the same state", () => {
    const first = new SeededRandom(123);
    const second = new SeededRandom(123);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it("resumes from a saved state", () => {
    const source = new SeededRandom(456);
    source.next();
    const restored = new SeededRandom(source.getState());

    expect([restored.next(), restored.next()]).toEqual([
      source.next(),
      source.next(),
    ]);
  });

  it("keeps values inside the unit interval", () => {
    const source = new SeededRandom(789);
    for (let index = 0; index < 100; index += 1) {
      expect(source.next()).toBeGreaterThanOrEqual(0);
      expect(source.next()).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- src/simulation/SeededRandom.test.ts
```

Expected: FAIL because `SeededRandom.ts` does not exist.

- [ ] **Step 3: Implement the minimal stateful PRNG**

```ts
const UINT32_RANGE = 0x1_0000_0000;

export class SeededRandom {
  private state: number;

  constructor(state: number) {
    this.state = state >>> 0;
  }

  next = (): number => {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };

  getState(): number {
    return this.state;
  }
}

export function createInitialSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}
```

- [ ] **Step 4: Run the focused test and full suite**

Run:

```bash
npm test -- src/simulation/SeededRandom.test.ts
npm test
```

Expected: new tests and all existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/SeededRandom.ts src/simulation/SeededRandom.test.ts
git commit -m "feat: add deterministic simulation random source"
```

### Task 2: Simulation Snapshot And Restoration

**Files:**
- Modify: `src/simulation/Simulation.ts`
- Modify: `src/simulation/Simulation.test.ts`

- [ ] **Step 1: Write failing snapshot tests**

Add tests that require a copied grid and restored scan direction:

```ts
it("creates an isolated snapshot with the next scan direction", () => {
  const simulation = new Simulation(3, 3, () => 0);
  simulation.paintCircle(1, 1, 0, Material.Sand);
  simulation.step();

  const snapshot = simulation.createSnapshot();
  snapshot.cells.fill(Material.Fire);

  expect(snapshot.scanLeftToRight).toBe(false);
  expect(simulation.cells).not.toEqual(snapshot.cells);
});

it("restores cells and scan direction without sharing the input buffer", () => {
  const cells = new Uint8Array([
    Material.Sand,
    Material.Empty,
    Material.Sand,
  ]);
  const simulation = Simulation.fromSnapshot(
    { width: 3, height: 1, cells, scanLeftToRight: false },
    () => 0,
  );
  cells.fill(Material.Fire);

  expect(simulation.createSnapshot()).toEqual({
    width: 3,
    height: 1,
    cells: new Uint8Array([
      Material.Sand,
      Material.Empty,
      Material.Sand,
    ]),
    scanLeftToRight: false,
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
```

Expected: FAIL because `createSnapshot` and `fromSnapshot` do not exist.

- [ ] **Step 3: Add the snapshot API**

Add:

```ts
export type SimulationSnapshot = {
  width: number;
  height: number;
  cells: Uint8Array;
  scanLeftToRight: boolean;
};
```

Implement:

```ts
static fromSnapshot(
  snapshot: SimulationSnapshot,
  random: RandomSource = Math.random,
): Simulation {
  if (snapshot.cells.length !== snapshot.width * snapshot.height) {
    throw new Error("Snapshot dimensions do not match its grid");
  }
  const simulation = new Simulation(snapshot.width, snapshot.height, random);
  simulation.cells.set(snapshot.cells);
  simulation.scanLeftToRight = snapshot.scanLeftToRight;
  return simulation;
}

createSnapshot(): SimulationSnapshot {
  return {
    width: this.width,
    height: this.height,
    cells: this.cells.slice(),
    scanLeftToRight: this.scanLeftToRight,
  };
}
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- src/simulation/Simulation.test.ts
npm test
```

Expected: PASS with existing material behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/Simulation.ts src/simulation/Simulation.test.ts
git commit -m "feat: snapshot and restore simulation state"
```

### Task 3: Versioned Share Codec

**Files:**
- Create: `src/sharing/shareState.ts`
- Create: `src/sharing/shareState.test.ts`

- [ ] **Step 1: Write failing round-trip and validation tests**

Test these public APIs:

```ts
export type SharedState = SimulationSnapshot & { randomState: number };
export function encodeShareState(state: SharedState): string;
export function decodeShareState(payload: string): SharedState;
export function parseShareHash(hash: string):
  | { kind: "none" }
  | { kind: "valid"; state: SharedState }
  | { kind: "invalid" };
export function buildShareUrl(href: string, payload: string): string;
```

Use these concrete fixtures for byte mutation tests:

```ts
const validState = {
  width: 2,
  height: 2,
  cells: new Uint8Array(4).fill(Material.Sand),
  randomState: 123,
  scanLeftToRight: true,
};

function payloadBytes(payload: string): Uint8Array {
  const padded = payload
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
}

function bytesPayload(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function mutatePayload(
  payload: string,
  mutation: (bytes: Uint8Array) => void,
): string {
  const bytes = payloadBytes(payload);
  mutation(bytes);
  return bytesPayload(bytes);
}
```

Required cases:

```ts
it("round trips mixed cells, random state, and scan direction", () => {
  const state = {
    width: 3,
    height: 2,
    cells: new Uint8Array([
      Material.Sand,
      Material.Sand,
      Material.Water,
      Material.Empty,
      Material.Fire,
      Material.Fire,
    ]),
    randomState: 0xfedcba98,
    scanLeftToRight: false,
  };

  expect(decodeShareState(encodeShareState(state))).toEqual(state);
});

it("emits URL-safe base64 without padding", () => {
  expect(encodeShareState(validState)).not.toMatch(/[+/=]/);
});

it("rejects malformed binary payloads", () => {
  const validPayload = encodeShareState(validState);
  const malformed = [
    mutatePayload(validPayload, (bytes) => {
      bytes[0] = 2;
    }),
    bytesPayload(payloadBytes(validPayload).slice(0, -1)),
    mutatePayload(validPayload, (bytes) => {
      bytes[9] = 2;
    }),
    mutatePayload(validPayload, (bytes) => {
      bytes[10] = 255;
    }),
    mutatePayload(validPayload, (bytes) => {
      bytes[11] = 0;
      bytes[12] = 0;
    }),
    mutatePayload(validPayload, (bytes) => {
      bytes[11] = 0;
      bytes[12] = 3;
    }),
  ];

  for (const payload of malformed) {
    expect(() => decodeShareState(payload)).toThrow();
  }
});

it("distinguishes absent and invalid share hashes", () => {
  expect(parseShareHash("")).toEqual({ kind: "none" });
  expect(parseShareHash("#other=value")).toEqual({ kind: "none" });
  expect(parseShareHash("#share=broken!")).toEqual({ kind: "invalid" });
});
```

- [ ] **Step 2: Run the codec test and verify RED**

Run:

```bash
npm test -- src/sharing/shareState.test.ts
```

Expected: FAIL because the sharing module does not exist.

- [ ] **Step 3: Implement binary RLE and base64url helpers**

Implementation requirements:

- Header is exactly 10 bytes.
- Version is `1`.
- Width and height are each `1..160`.
- Flag byte only allows bit 0.
- Every RLE record is exactly three bytes.
- Run lengths are `1..65535`.
- Material IDs are `Material.Empty..Material.Plant`.
- Decoded run total must equal `width * height`.
- `encodeShareState` validates the input before encoding.
- `buildShareUrl` uses `new URL(href)`, replaces only `hash`, and returns `url.toString()`.
- `parseShareHash` catches codec errors and never throws.

Core encoding shape:

```ts
const bytes: number[] = [
  VERSION,
  width >>> 8,
  width & 0xff,
  height >>> 8,
  height & 0xff,
  randomState >>> 24,
  randomState >>> 16,
  randomState >>> 8,
  randomState,
  scanLeftToRight ? 1 : 0,
];
```

Use small loop-based `bytesToBase64Url` and `base64UrlToBytes` helpers around browser `btoa` and `atob`; do not spread the full grid into a function call.

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- src/sharing/shareState.test.ts
npm test
```

Expected: all malformed cases are rejected and all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sharing/shareState.ts src/sharing/shareState.test.ts
git commit -m "feat: encode versioned share snapshots"
```

### Task 4: Pause-Only Single Step

**Files:**
- Modify: `src/canvas/SandboxCanvas.tsx`
- Modify: `src/canvas/SandboxCanvas.test.tsx`

- [ ] **Step 1: Write failing single-step tests**

Pass `stepVersion={0}` to existing test renders, then add:

```ts
it("steps exactly once when paused stepVersion changes", () => {
  const simulation = new Simulation(3, 3, () => 0);
  const step = vi.spyOn(simulation, "step");
  const { rerender } = render(
    <SandboxCanvas
      simulation={simulation}
      tool={Material.Sand}
      paused
      clearVersion={0}
      stepVersion={0}
    />,
  );

  rerender(
    <SandboxCanvas
      simulation={simulation}
      tool={Material.Sand}
      paused
      clearVersion={0}
      stepVersion={1}
    />,
  );

  expect(step).toHaveBeenCalledTimes(1);
});

it("does not manually step while running", () => {
  const simulation = new Simulation(3, 3, () => 0);
  const step = vi.spyOn(simulation, "step");
  const { rerender } = render(
    <SandboxCanvas
      simulation={simulation}
      tool={Material.Sand}
      paused={false}
      clearVersion={0}
      stepVersion={0}
    />,
  );

  rerender(
    <SandboxCanvas
      simulation={simulation}
      tool={Material.Sand}
      paused={false}
      clearVersion={0}
      stepVersion={1}
    />,
  );

  expect(step).not.toHaveBeenCalled();
});
```

Also test that initial nonzero `stepVersion` and pause toggling do not step.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
```

Expected: FAIL because `stepVersion` is not a recognized prop.

- [ ] **Step 3: Implement version-driven stepping**

Add the prop and a ref:

```ts
stepVersion: number;
const lastStepVersionRef = useRef(stepVersion);
```

Add an effect:

```ts
useEffect(() => {
  if (stepVersion === lastStepVersionRef.current) return;
  lastStepVersionRef.current = stepVersion;
  if (paused) activeSimulation.step();
}, [activeSimulation, paused, stepVersion]);
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- src/canvas/SandboxCanvas.test.tsx
npm test
```

Expected: exactly one manual step per paused version increment.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/SandboxCanvas.tsx src/canvas/SandboxCanvas.test.tsx
git commit -m "feat: add pause-only single stepping"
```

### Task 5: Toolbar Controls And Feedback

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Write failing toolbar tests**

Add props:

```ts
onStep: () => void;
onShare: () => void;
shareStatus: "idle" | "copied" | "failed";
```

Test:

```ts
it("disables single step while running", () => {
  renderToolbar({ paused: false });
  expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
});

it("steps once while paused", async () => {
  const onStep = vi.fn();
  renderToolbar({ paused: true, onStep });
  await userEvent.click(screen.getByRole("button", { name: "单步" }));
  expect(onStep).toHaveBeenCalledTimes(1);
});

it("shares and announces copy status", async () => {
  const onShare = vi.fn();
  renderToolbar({ onShare, shareStatus: "copied" });
  await userEvent.click(screen.getByRole("button", { name: "已复制" }));
  expect(onShare).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent("分享链接已复制");
});
```

Update existing renders with neutral defaults.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: FAIL because the new controls do not exist.

- [ ] **Step 3: Implement the controls**

Add four action buttons in order:

1. 暂停/继续
2. 单步, `disabled={!paused}`
3. 清空
4. 分享/已复制/复制失败

Render an always-mounted polite live region:

```tsx
<p className="control-status" role="status" aria-live="polite">
  {shareStatus === "copied"
    ? "分享链接已复制"
    : shareStatus === "failed"
      ? "复制失败，请确认浏览器允许访问剪贴板"
      : ""}
</p>
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
npm test
```

Expected: controls are accessible and all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat: add step and share toolbar controls"
```

### Task 6: Compose Restored Sessions And Clipboard Sharing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing App integration tests**

Before each test, restore `window.history` to `/` and stub clipboard as needed.

Required tests:

```ts
it("renders day three controls", () => {
  render(<App />);
  expect(screen.getByText("试验 03")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument();
});

it("copies a share URL and reports success", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  render(<App />);

  await userEvent.click(screen.getByRole("button", { name: "分享" }));

  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining("#share="),
  );
  expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
});

it("reports clipboard rejection without crashing", async () => {
  const writeText = vi.fn().mockRejectedValue(new Error("denied"));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: "分享" }));
  expect(screen.getByRole("button", { name: "复制失败" })).toBeInTheDocument();
});

it("opens a valid shared state paused", () => {
  window.history.replaceState(null, "", `/#share=${payload}`);
  render(<App />);
  expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
});

it("falls back from an invalid share hash", () => {
  window.history.replaceState(null, "", "/#share=broken!");
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "分享链接无效，已打开空白画布",
  );
});
```

- [ ] **Step 2: Run the App test and verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because day-three composition is absent.

- [ ] **Step 3: Implement stable session creation**

Add a pure local helper in `App.tsx`:

```ts
type SandboxSession = {
  simulation: Simulation;
  random: SeededRandom;
  restored: boolean;
  loadError: boolean;
};

function createSession(hash: string): SandboxSession {
  const parsed = parseShareHash(hash);
  if (parsed.kind === "valid") {
    const random = new SeededRandom(parsed.state.randomState);
    return {
      simulation: Simulation.fromSnapshot(parsed.state, random.next),
      random,
      restored: true,
      loadError: false,
    };
  }

  const random = new SeededRandom(createInitialSeed());
  return {
    simulation: new Simulation(160, 160, random.next),
    random,
    restored: false,
    loadError: parsed.kind === "invalid",
  };
}
```

Create it once:

```ts
const [session] = useState(() => createSession(window.location.hash));
const [paused, setPaused] = useState(session.restored);
```

Implement share:

```ts
const handleShare = async () => {
  const payload = encodeShareState({
    ...session.simulation.createSnapshot(),
    randomState: session.random.getState(),
  });
  const url = buildShareUrl(window.location.href, payload);

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url);
    setShareStatus("copied");
  } catch {
    setShareStatus("failed");
  }
};
```

Use one timeout ref/effect to return status to `idle` after 2000ms and clear it on unmount. Pass `simulation`, `stepVersion`, and all Toolbar callbacks. Render the load error separately so it does not collide with the Toolbar live region.

- [ ] **Step 4: Add deterministic continuation integration coverage**

In `shareState.test.ts` or `App.test.tsx`, restore the same decoded state twice:

```ts
const firstRandom = new SeededRandom(state.randomState);
const secondRandom = new SeededRandom(state.randomState);
const first = Simulation.fromSnapshot(state, firstRandom.next);
const second = Simulation.fromSnapshot(state, secondRandom.next);

for (let step = 0; step < 20; step += 1) {
  first.step();
  second.step();
}

expect(first.createSnapshot()).toEqual(second.createSnapshot());
expect(firstRandom.getState()).toBe(secondRandom.getState());
```

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
npm test -- src/App.test.tsx src/sharing/shareState.test.ts
npm test
```

Expected: restored sessions pause, copy feedback works, invalid links recover, and all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/sharing/shareState.test.ts
git commit -m "feat: compose shareable sandbox sessions"
```

### Task 7: Responsive Styling And Browser Acceptance

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS behavior**

Change the action layout to four equal desktop columns and two mobile columns:

```css
.simulation-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.tool-button:disabled {
  color: #8b8177;
  background: #e5ddd1;
  box-shadow: none;
  cursor: not-allowed;
}

.control-status,
.load-status {
  min-height: 1.25rem;
  margin: 0;
  color: #67594c;
  font: 600 0.82rem/1.25 system-ui, sans-serif;
}

@media (max-width: 520px) {
  .simulation-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Ensure an empty live region does not add a large visual gap.

- [ ] **Step 2: Run automated verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all tests PASS, Vite production build succeeds, and no whitespace errors appear.

- [ ] **Step 3: Start the app and verify in Browser**

Run:

```bash
npm run dev -- --port 5175
```

Using the Browser plugin, verify:

- Desktop renders “试验 03”.
- Single-step is disabled while running.
- Pausing enables single-step.
- A falling material moves once per single-step and remains paused.
- Share copies a `#share=` URL and shows “已复制”.
- Opening the copied URL restores the same scene and shows “继续”.
- Source and restored pages remain identical after the same manual steps.
- Invalid `#share=` shows the recovery message and a usable blank canvas.
- At `390 × 844`, page width equals viewport width, material palette scrolls, and all four actions are visible.
- Console has no relevant errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "style: finish day three responsive controls"
```

### Task 8: Final Audit

**Files:**
- Modify only if verification finds a proven defect.

- [ ] **Step 1: Run fresh final checks**

```bash
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: all tests PASS, build succeeds, diff check is clean, and no uncommitted files remain.

- [ ] **Step 2: Review completion criteria**

Confirm:

- Single-step is pause-only and advances exactly once.
- Share payload includes cells, dimensions, PRNG state, and scan direction.
- Restored shares always begin paused.
- Clipboard and malformed-link failures are non-destructive.
- No API Key, backend, database, upload, or new dependency was added.

- [ ] **Step 3: Finish the branch**

Use `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch`.
