import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DRAWABLE_MATERIALS,
  Material,
} from "../simulation/materials";
import { EXAMPLE_SCENES } from "../simulation/exampleScenes";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  it("exposes the controls as a named toolbar", () => {
    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    expect(
      screen.getByRole("toolbar", { name: "沙盒工具" }),
    ).toBeInTheDocument();
  });

  it("renders a brush radius slider and reports changes", () => {
    const onBrushRadiusChange = vi.fn();
    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        brushRadius={2}
        onBrushRadiusChange={onBrushRadiusChange}
        onExampleSceneSelect={vi.fn()}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    const slider = screen.getByRole("slider", { name: "笔刷大小" });
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "8");
    expect(slider).toHaveValue("2");
    expect(screen.getByText("笔刷 2")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "6" } });
    expect(onBrushRadiusChange).toHaveBeenCalledWith(6);
  });

  it("renders example scene buttons and reports selection", async () => {
    const user = userEvent.setup();
    const onExampleSceneSelect = vi.fn();
    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        brushRadius={2}
        onBrushRadiusChange={vi.fn()}
        onExampleSceneSelect={onExampleSceneSelect}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    for (const scene of EXAMPLE_SCENES) {
      expect(
        screen.getByRole("button", { name: scene.label }),
      ).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "酸液腐蚀" }));
    expect(onExampleSceneSelect).toHaveBeenCalledWith("acidCorrosion");
  });

  it("marks sand as selected and changes the tool to the eraser", async () => {
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

    expect(screen.getByRole("button", { name: "沙子" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "橡皮" }));

    expect(onToolChange).toHaveBeenCalledWith(Material.Empty);
  });

  it("renders every material and changes the active tool to water", async () => {
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

    for (const definition of DRAWABLE_MATERIALS) {
      expect(
        screen.getByRole("button", { name: definition.label }),
      ).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "水" }));

    expect(onToolChange).toHaveBeenCalledWith(Material.Water);
  });

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

  it("marks only fire as selected when fire is active", () => {
    render(
      <Toolbar
        tool={Material.Fire}
        paused={false}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    for (const definition of DRAWABLE_MATERIALS) {
      expect(
        screen.getByRole("button", { name: definition.label }),
      ).toHaveAttribute(
        "aria-pressed",
        String(definition.material === Material.Fire),
      );
    }
  });

  it("marks the eraser as selected instead of sand", () => {
    render(
      <Toolbar
        tool={Material.Empty}
        paused={false}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    expect(screen.getByRole("button", { name: "沙子" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "橡皮" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("pauses a running simulation and clears it", async () => {
    const user = userEvent.setup();
    const onPauseChange = vi.fn();
    const onClear = vi.fn();

    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        onToolChange={vi.fn()}
        onPauseChange={onPauseChange}
        onClear={onClear}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    await user.click(screen.getByRole("button", { name: "暂停" }));
    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(onPauseChange).toHaveBeenCalledWith(true);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("resumes a paused simulation", async () => {
    const user = userEvent.setup();
    const onPauseChange = vi.fn();

    render(
      <Toolbar
        tool={Material.Sand}
        paused
        onToolChange={vi.fn()}
        onPauseChange={onPauseChange}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    await user.click(screen.getByRole("button", { name: "继续" }));

    expect(onPauseChange).toHaveBeenCalledWith(false);
  });

  it("disables single step while running", () => {
    render(
      <Toolbar
        tool={Material.Sand}
        paused={false}
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
  });

  it("steps once while paused", async () => {
    const user = userEvent.setup();
    const onStep = vi.fn();
    render(
      <Toolbar
        tool={Material.Sand}
        paused
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={onStep}
        onShare={vi.fn()}
        shareStatus="idle"
      />,
    );

    await user.click(screen.getByRole("button", { name: "单步" }));

    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("shares and announces successful copying", async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    render(
      <Toolbar
        tool={Material.Sand}
        paused
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={onShare}
        shareStatus="copied"
      />,
    );

    await user.click(screen.getByRole("button", { name: "已复制" }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "分享链接已复制",
    );
  });

  it("announces clipboard failure", () => {
    render(
      <Toolbar
        tool={Material.Sand}
        paused
        onToolChange={vi.fn()}
        onPauseChange={vi.fn()}
        onClear={vi.fn()}
        onStep={vi.fn()}
        onShare={vi.fn()}
        shareStatus="failed"
      />,
    );

    expect(screen.getByRole("button", { name: "复制失败" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "复制失败，请确认浏览器允许访问剪贴板",
    );
  });
});
