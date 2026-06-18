import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { App } from "./App";
import { encodeShareState } from "./sharing/shareState";
import {
  DRAWABLE_MATERIALS,
  Material,
} from "./simulation/materials";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the title, sandbox, and day six playtest controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "像素炼金术" }),
    ).toBeInTheDocument();
    expect(screen.getByText("试验 06")).toBeInTheDocument();
    expect(
      screen.getByText("选择材料，在画布上绘制；拖动笔刷滑块快速铺材料。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("不会搭配时，可以先加载示例场景，再用单步观察反应。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "分享会复制当前画布和随机状态；需要 HTTPS 或 localhost 剪贴板权限。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("像素沙盒")).toBeInTheDocument();
    for (const definition of DRAWABLE_MATERIALS) {
      expect(
        screen.getByRole("button", { name: definition.label }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("slider", { name: "笔刷大小" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "熔岩遇水" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "橡皮" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "单步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
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

  it("updates the brush slider label", () => {
    render(<App />);

    const slider = screen.getByRole("slider", { name: "笔刷大小" });
    fireEvent.change(slider, { target: { value: "6" } });

    expect(screen.getByText("笔刷 6")).toBeInTheDocument();
    expect(slider).toHaveValue("6");
  });

  it("loads an example scene paused", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "熔岩遇水" }));

    expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
  });

  it("hides scene guidance until an example is selected", () => {
    render(<App />);

    expect(screen.queryByText("当前示例：熔岩遇水")).not.toBeInTheDocument();
    expect(
      screen.queryByText("建议：点“单步”慢慢观察反应。"),
    ).not.toBeInTheDocument();
  });

  it("shows guidance for the selected example scene", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "熔岩遇水" }));

    expect(screen.getByText("当前示例：熔岩遇水")).toBeInTheDocument();
    expect(
      screen.getByText("熔岩遇水会变成石头，并冒出蒸汽。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("建议：点“单步”慢慢观察反应。"),
    ).toBeInTheDocument();
  });

  it("clears scene guidance when the canvas is cleared", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "熔岩遇水" }));
    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.queryByText("当前示例：熔岩遇水")).not.toBeInTheDocument();
  });

  it("copies a share URL without changing the current address", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const currentHref = window.location.href;
    render(<App />);

    await user.click(screen.getByRole("button", { name: "分享" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("#share="),
    );
    expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
    expect(screen.getByText("分享链接已复制")).toBeInTheDocument();
    expect(window.location.href).toBe(currentHref);
  });

  it("reports clipboard rejection without crashing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "分享" }));

    expect(
      screen.getByRole("button", { name: "复制失败" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("复制失败，请确认浏览器允许访问剪贴板"),
    ).toBeInTheDocument();
  });

  it("reports when the clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "分享" }));

    expect(
      screen.getByRole("button", { name: "复制失败" }),
    ).toBeInTheDocument();
  });

  it("reports when the clipboard request never settles", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(
      () => new Promise<void>(() => undefined),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "分享" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(
      screen.getByRole("button", { name: "复制失败" }),
    ).toBeInTheDocument();
  });

  it("opens a valid shared state paused", () => {
    const payload = encodeShareState({
      width: 3,
      height: 2,
      cells: new Uint8Array([
        Material.Sand,
        Material.Water,
        Material.Empty,
        Material.Wall,
        Material.Fire,
        Material.Plant,
      ]),
      randomState: 42,
      scanLeftToRight: false,
    });
    window.history.replaceState(null, "", `/#share=${payload}`);

    render(<App />);

    const canvas = screen.getByLabelText("像素沙盒");
    expect(canvas).toHaveAttribute("width", "3");
    expect(canvas).toHaveAttribute("height", "2");
    expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "单步" })).toBeEnabled();
    expect(
      screen.queryByText("分享链接无效，已打开空白画布"),
    ).not.toBeInTheDocument();
  });

  it("falls back to a usable blank canvas for an invalid share hash", () => {
    window.history.replaceState(null, "", "/#share=broken!");

    render(<App />);

    const canvas = screen.getByLabelText("像素沙盒");
    expect(canvas).toHaveAttribute("width", "160");
    expect(canvas).toHaveAttribute("height", "160");
    expect(
      screen.getByText("分享链接无效，已打开空白画布"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
  });
});
