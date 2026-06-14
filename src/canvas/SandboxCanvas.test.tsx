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

  it("paints sand at the pointer position", () => {
    const simulation = new Simulation(10, 10, () => 0);

    render(
      <SandboxCanvas
        simulation={simulation}
        tool={Material.Sand}
        paused
        clearVersion={0}
      />,
    );

    const canvas = screen.getByRole("img", { name: "像素沙盒" });
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
    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, "setPointerCapture", {
      configurable: true,
      value: setPointerCapture,
    });

    fireEvent.pointerDown(canvas, {
      clientX: 55,
      clientY: 55,
      pointerId: 7,
    });

    expect(simulation.getCell(5, 5)).toBe(Material.Sand);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
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
