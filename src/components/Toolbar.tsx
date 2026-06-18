import type { CSSProperties } from "react";
import {
  DRAWABLE_MATERIALS,
  Material,
  getMaterialDefinition,
  type MaterialDefinition,
} from "../simulation/materials";
import {
  EXAMPLE_SCENES,
  type ExampleSceneId,
} from "../simulation/exampleScenes";

export type ShareStatus = "idle" | "copied" | "failed";

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

function MaterialButton({
  definition,
  selected,
  onSelect,
}: {
  definition: MaterialDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const [red, green, blue] = definition.colors[0];
  const swatchStyle = {
    "--material-color": `rgb(${red} ${green} ${blue})`,
  } as CSSProperties;

  return (
    <button
      className={`tool-button material-button material-button--${definition.cssName}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span
        className="material-swatch"
        style={swatchStyle}
        aria-hidden="true"
      />
      <span>{definition.label}</span>
    </button>
  );
}

export function Toolbar({
  tool,
  paused,
  brushRadius = 2,
  onBrushRadiusChange = () => undefined,
  onExampleSceneSelect = () => undefined,
  onToolChange,
  onPauseChange,
  onClear,
  onStep,
  onShare,
  shareStatus,
}: ToolbarProps) {
  const eraser = getMaterialDefinition(Material.Empty);
  const shareLabel =
    shareStatus === "copied"
      ? "已复制"
      : shareStatus === "failed"
        ? "复制失败"
        : "分享";
  const statusMessage =
    shareStatus === "copied"
      ? "分享链接已复制"
      : shareStatus === "failed"
        ? "复制失败，请确认浏览器允许访问剪贴板"
        : "";

  return (
    <div className="sandbox-controls">
      <div
        className="material-palette"
        role="toolbar"
        aria-label="沙盒工具"
      >
        {DRAWABLE_MATERIALS.map((definition) => (
          <MaterialButton
            key={definition.material}
            definition={definition}
            selected={tool === definition.material}
            onSelect={() => onToolChange(definition.material)}
          />
        ))}
        <MaterialButton
          definition={eraser}
          selected={tool === Material.Empty}
          onSelect={() => onToolChange(Material.Empty)}
        />
      </div>

      <div className="playtest-controls">
        <div
          className="brush-control"
          role="group"
          aria-label="笔刷设置"
        >
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

        <div
          className="example-scenes"
          role="group"
          aria-label="示例场景"
        >
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

      <div
        className="simulation-actions"
        role="group"
        aria-label="模拟操作"
      >
        <button
          className="tool-button"
          type="button"
          onClick={() => onPauseChange(!paused)}
        >
          {paused ? "继续" : "暂停"}
        </button>
        <button
          className="tool-button"
          type="button"
          disabled={!paused}
          onClick={onStep}
        >
          单步
        </button>
        <button className="tool-button" type="button" onClick={onClear}>
          清空
        </button>
        <button className="tool-button" type="button" onClick={onShare}>
          {shareLabel}
        </button>
      </div>

      <p className="control-status" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
