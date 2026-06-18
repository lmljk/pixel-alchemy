import { useEffect, useState } from "react";
import { SandboxCanvas } from "./canvas/SandboxCanvas";
import {
  Toolbar,
  type ShareStatus,
} from "./components/Toolbar";
import {
  buildShareUrl,
  encodeShareState,
  parseShareHash,
} from "./sharing/shareState";
import {
  SeededRandom,
  createInitialSeed,
} from "./simulation/SeededRandom";
import { Simulation } from "./simulation/Simulation";
import {
  applyExampleScene,
  type ExampleSceneId,
} from "./simulation/exampleScenes";
import { Material } from "./simulation/materials";

const DEFAULT_GRID_SIZE = 160;
const CLIPBOARD_TIMEOUT_MS = 1500;
const SHARE_STATUS_DURATION_MS = 2000;

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
    simulation: new Simulation(
      DEFAULT_GRID_SIZE,
      DEFAULT_GRID_SIZE,
      random.next,
    ),
    random,
    restored: false,
    loadError: parsed.kind === "invalid",
  };
}

function writeClipboardWithTimeout(text: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard?.writeText) {
    return Promise.reject(new Error("Clipboard unavailable"));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };
    const timeoutId = window.setTimeout(
      () => finish(() => reject(new Error("Clipboard timed out"))),
      CLIPBOARD_TIMEOUT_MS,
    );

    Promise.resolve()
      .then(() => clipboard.writeText(text))
      .then(
        () => finish(resolve),
        (error: unknown) => finish(() => reject(error)),
      );
  });
}

export function App() {
  const [session] = useState(() => createSession(window.location.hash));
  const [tool, setTool] = useState(Material.Sand);
  const [paused, setPaused] = useState(session.restored);
  const [clearVersion, setClearVersion] = useState(0);
  const [stepVersion, setStepVersion] = useState(0);
  const [brushRadius, setBrushRadius] = useState(2);
  const [shareStatus, setShareStatus] =
    useState<ShareStatus>("idle");

  useEffect(() => {
    if (shareStatus === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setShareStatus("idle"),
      SHARE_STATUS_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [shareStatus]);

  const handleShare = async () => {
    try {
      const payload = encodeShareState({
        ...session.simulation.createSnapshot(),
        randomState: session.random.getState(),
      });
      const url = buildShareUrl(window.location.href, payload);
      await writeClipboardWithTimeout(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  };

  const handleExampleSceneSelect = (sceneId: ExampleSceneId) => {
    applyExampleScene(session.simulation, sceneId);
    setPaused(true);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>像素炼金术</h1>
        <span className="experiment-label">试验 06</span>
      </header>

      <section className="intro-card" aria-label="玩法说明">
        <p>选择材料，在画布上绘制；拖动笔刷滑块快速铺材料。</p>
        <p>不会搭配时，可以先加载示例场景，再用单步观察反应。</p>
        <p>分享会复制当前画布和随机状态；需要 HTTPS 或 localhost 剪贴板权限。</p>
      </section>

      <section className="sandbox-frame" aria-label="沙盒实验区">
        <SandboxCanvas
          simulation={session.simulation}
          tool={tool}
          paused={paused}
          clearVersion={clearVersion}
          stepVersion={stepVersion}
          brushRadius={brushRadius}
        />
      </section>

      {session.loadError && (
        <p className="load-status" role="status">
          分享链接无效，已打开空白画布
        </p>
      )}

      <Toolbar
        tool={tool}
        paused={paused}
        brushRadius={brushRadius}
        onBrushRadiusChange={setBrushRadius}
        onExampleSceneSelect={handleExampleSceneSelect}
        onToolChange={setTool}
        onPauseChange={setPaused}
        onClear={() => setClearVersion((version) => version + 1)}
        onStep={() => setStepVersion((version) => version + 1)}
        onShare={handleShare}
        shareStatus={shareStatus}
      />
    </main>
  );
}
