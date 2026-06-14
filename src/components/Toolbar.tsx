import { Material } from "../simulation/materials";

type ToolbarProps = {
  tool: Material;
  paused: boolean;
  onToolChange: (tool: Material) => void;
  onPauseChange: (paused: boolean) => void;
  onClear: () => void;
};

export function Toolbar({
  tool,
  paused,
  onToolChange,
  onPauseChange,
  onClear,
}: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="沙盒工具">
      <button
        className="tool-button tool-button--sand"
        type="button"
        aria-pressed={tool === Material.Sand}
        onClick={() => onToolChange(Material.Sand)}
      >
        沙子
      </button>
      <button
        className="tool-button"
        type="button"
        aria-pressed={tool === Material.Empty}
        onClick={() => onToolChange(Material.Empty)}
      >
        橡皮
      </button>
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
  );
}
