import type { CSSProperties } from "react";
import {
  DRAWABLE_MATERIALS,
  Material,
  getMaterialDefinition,
  type MaterialDefinition,
} from "../simulation/materials";

type ToolbarProps = {
  tool: Material;
  paused: boolean;
  onToolChange: (tool: Material) => void;
  onPauseChange: (paused: boolean) => void;
  onClear: () => void;
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
}: ToolbarProps) {
  const eraser = getMaterialDefinition(Material.Empty);

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
        <button className="tool-button" type="button" onClick={onClear}>
          清空
        </button>
      </div>
    </div>
  );
}
