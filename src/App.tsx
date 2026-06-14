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
import { Material } from "./simulation/materials";

const DEFAULT_GRID_SIZE = 160;
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

export function App() {
  const [session] = useState(() => createSession(window.location.hash));
  const [tool, setTool] = useState(Material.Sand);
  const [paused, setPaused] = useState(session.restored);
  const [clearVersion, setClearVersion] = useState(0);
  const [stepVersion, setStepVersion] = useState(0);
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
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      const payload = encodeShareState({
        ...session.simulation.createSnapshot(),
        randomState: session.random.getState(),
      });
      const url = buildShareUrl(window.location.href, payload);
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>像素炼金术</h1>
        <span className="experiment-label">试验 03</span>
      </header>

      <section className="sandbox-frame" aria-label="沙盒实验区">
        <SandboxCanvas
          simulation={session.simulation}
          tool={tool}
          paused={paused}
          clearVersion={clearVersion}
          stepVersion={stepVersion}
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
