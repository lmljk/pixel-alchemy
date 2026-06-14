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
        <span className="experiment-label">试验 02</span>
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
