import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Material } from "../simulation/materials";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
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
      />,
    );

    expect(screen.getByRole("button", { name: "沙子" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "橡皮" }));

    expect(onToolChange).toHaveBeenCalledWith(Material.Empty);
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
      />,
    );

    await user.click(screen.getByRole("button", { name: "暂停" }));
    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(onPauseChange).toHaveBeenCalledWith(true);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
