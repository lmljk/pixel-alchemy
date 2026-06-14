import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the title, sandbox, and day one controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "像素炼金术" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("像素沙盒")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "沙子" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
  });
});
