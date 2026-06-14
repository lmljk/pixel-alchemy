import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { DRAWABLE_MATERIALS } from "./simulation/materials";

describe("App", () => {
  it("renders the title, sandbox, and day two controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "像素炼金术" }),
    ).toBeInTheDocument();
    expect(screen.getByText("试验 02")).toBeInTheDocument();
    expect(screen.getByLabelText("像素沙盒")).toBeInTheDocument();
    for (const definition of DRAWABLE_MATERIALS) {
      expect(
        screen.getByRole("button", { name: definition.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
  });

  it("updates the selected tool and pause control", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sandButton = screen.getByRole("button", { name: "沙子" });
    const eraserButton = screen.getByRole("button", { name: "橡皮" });

    await user.click(eraserButton);

    expect(sandButton).toHaveAttribute("aria-pressed", "false");
    expect(eraserButton).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "暂停" }));

    expect(
      screen.getByRole("button", { name: "继续" }),
    ).toBeInTheDocument();
  });

  it("selects oil from the material palette", async () => {
    const user = userEvent.setup();
    render(<App />);

    const oilButton = screen.getByRole("button", { name: "油" });
    await user.click(oilButton);

    expect(oilButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "沙子" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
