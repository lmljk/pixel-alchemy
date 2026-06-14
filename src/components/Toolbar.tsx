import type { CSSProperties } from "react";
import {
  DRAWABLE_MATERIALS,
  Material,
  getMaterialDefinition,
  type MaterialDefinition,
} from "../simulation/materials";

export type ShareStatus = "idle" | "copied" | "failed";

type ToolbarProps = {
  tool: Material;
  paused: boolean;
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
