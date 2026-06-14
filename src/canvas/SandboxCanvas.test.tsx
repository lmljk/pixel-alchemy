import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";
import { SandboxCanvas } from "./SandboxCanvas";

describe("SandboxCanvas", () => {
  let frameCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    frameCallbacks = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  function runNextFrame(timestamp: number): void {
    const callback = frameCallbacks.shift();
    expect(callback).toBeDefined();
    act(() => callback?.(timestamp));
  }

  function renderPointerCanvas(
    simulation: Simulation,
  ): HTMLCanvasElement {
    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );

    const canvas = screen.getByRole("application", {
      name: "像素沙盒",
    }) as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });

    return canvas;
  }

  function installPointerCapture(
    canvas: HTMLCanvasElement,
    implementation = vi.fn(),
  ) {
    Object.defineProperty(canvas, "setPointerCapture", {
      configurable: true,
      value: implementation,
    });
  }

  it("is focusable and describes its keyboard controls", () => {
    const simulation = new Simulation(10, 10, () => 0);

    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );

    const canvas = screen.getByRole("application", {
      name: "像素沙盒",
    });

    expect(canvas).toHaveAttribute("tabindex", "0");
    expect(canvas).toHaveAttribute(
      "aria-description",
      "方向键移动笔尖，空格或回车绘制",
    );

    canvas.focus();
    expect(canvas).toHaveFocus();
  });

  it("moves the keyboard cursor, paints, and erases with the active tool", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");
    const { rerender } = render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );
    const canvas = screen.getByRole("application", {
      name: "像素沙盒",
    });
    canvas.focus();

    expect(fireEvent.keyDown(canvas, { key: "ArrowRight" })).toBe(false);
    expect(fireEvent.keyDown(canvas, { key: " " })).toBe(false);
    expect(paintCircle).toHaveBeenLastCalledWith(
      6,
      5,
      2,
      Material.Sand,
    );

    rerender(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Empty}
        paused
        clearVersion={0}
      />,
    );
    paintCircle.mockClear();

    expect(fireEvent.keyDown(canvas, { key: "Enter" })).toBe(false);
    expect(paintCircle).toHaveBeenCalledWith(
      6,
      5,
      2,
      Material.Empty,
    );
    expect(simulation.getCell(6, 5)).toBe(Material.Empty);
  });

  it("keeps arrow movement in bounds and ignores unrelated keys", () => {
    const simulation = new Simulation(1, 1, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");

    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );
    const canvas = screen.getByRole("application", {
      name: "像素沙盒",
    });

    for (const key of [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ]) {
      expect(fireEvent.keyDown(canvas, { key })).toBe(false);
    }

    expect(fireEvent.keyDown(canvas, { key: "a" })).toBe(true);
    expect(paintCircle).not.toHaveBeenCalled();

    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(paintCircle).toHaveBeenCalledWith(0, 0, 2, Material.Sand);
  });

  it("paints sand at the pointer position", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const canvas = renderPointerCanvas(simulation);
    const setPointerCapture = vi.fn();
    installPointerCapture(canvas, setPointerCapture);

    fireEvent.pointerDown(canvas, {
      clientX: 55,
      clientY: 55,
      pointerId: 7,
    });

    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("paints the first point when pointer capture is unavailable", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const canvas = renderPointerCanvas(simulation);
    Object.defineProperty(canvas, "setPointerCapture", {
      configurable: true,
      value: undefined,
    });

    expect(() =>
      fireEvent.pointerDown(canvas, {
        clientX: 55,
        clientY: 55,
        pointerId: 7,
      }),
    ).not.toThrow();
    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
  });

  it("paints the first point when pointer capture throws", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const canvas = renderPointerCanvas(simulation);
    installPointerCapture(
      canvas,
      vi.fn(() => {
        throw new DOMException("Pointer capture failed");
      }),
    );

    expect(() =>
      fireEvent.pointerDown(canvas, {
        clientX: 55,
        clientY: 55,
        pointerId: 7,
      }),
    ).not.toThrow();
    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
  });

  it("interpolates pointer movement across grid cells", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");
    const canvas = renderPointerCanvas(simulation);
    installPointerCapture(canvas);

    fireEvent.pointerDown(canvas, {
      clientX: 15,
      clientY: 15,
      pointerId: 7,
    });
    paintCircle.mockClear();

    fireEvent.pointerMove(canvas, {
      clientX: 45,
      clientY: 15,
      pointerId: 7,
    });

    expect(
      paintCircle.mock.calls.map(([x, y]) => ({ x, y })),
    ).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]);
  });

  it("restarts the stroke after moving outside the canvas", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");
    const canvas = renderPointerCanvas(simulation);
    installPointerCapture(canvas);

    fireEvent.pointerDown(canvas, {
      clientX: 15,
      clientY: 15,
      pointerId: 7,
    });
    paintCircle.mockClear();

    fireEvent.pointerMove(canvas, {
      clientX: 105,
      clientY: 15,
      pointerId: 7,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 85,
      clientY: 15,
      pointerId: 7,
    });

    expect(paintCircle).toHaveBeenCalledTimes(1);
    expect(paintCircle).toHaveBeenCalledWith(
      8,
      1,
      2,
      Material.Sand,
    );
  });

  it("stops painting after pointer up", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");
    const canvas = renderPointerCanvas(simulation);
    installPointerCapture(canvas);

    fireEvent.pointerDown(canvas, {
      clientX: 15,
      clientY: 15,
      pointerId: 7,
    });
    paintCircle.mockClear();
    fireEvent.pointerUp(canvas, { pointerId: 7 });
    fireEvent.pointerMove(canvas, {
      clientX: 45,
      clientY: 15,
      pointerId: 7,
    });

    expect(paintCircle).not.toHaveBeenCalled();
  });

  it("stops painting after pointer cancel", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const paintCircle = vi.spyOn(simulation, "paintCircle");
    const canvas = renderPointerCanvas(simulation);
    installPointerCapture(canvas);

    fireEvent.pointerDown(canvas, {
      clientX: 15,
      clientY: 15,
      pointerId: 7,
    });
    paintCircle.mockClear();
    fireEvent.pointerCancel(canvas, { pointerId: 7 });
    fireEvent.pointerMove(canvas, {
      clientX: 45,
      clientY: 15,
      pointerId: 7,
    });

    expect(paintCircle).not.toHaveBeenCalled();
  });

  it("does not step while paused", () => {
    const simulation = new Simulation(10, 10, () => 0);
    const step = vi.spyOn(simulation, "step");

    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );

    runNextFrame(0);
    runNextFrame(20);

    expect(step).not.toHaveBeenCalled();
  });

  it("steps once after enough running time has accumulated", () => {
    const simulation = new Simulation(10, 10, () => 0);
    simulation.paintCircle(5, 4, 0, Material.Sand);

    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused={false}
        clearVersion={0}
      />,
    );

    runNextFrame(0);
    runNextFrame(20);

    expect(simulation.getCell(5, 4)).toBe(Material.Empty);
    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
  });

  it("clears only after clearVersion changes", () => {
    const simulation = new Simulation(10, 10, () => 0);
    simulation.paintCircle(5, 5, 0, Material.Sand);

    const { rerender } = render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );

    expect(simulation.getCell(5, 5)).toBe(Material.Sand);

    rerender(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={1}
      />,
    );

    expect(simulation.getCell(5, 5)).toBe(Material.Empty);
  });
});
