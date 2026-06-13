import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class TestImageData {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

globalThis.ImageData = TestImageData as unknown as typeof ImageData;
vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
vi.stubGlobal("cancelAnimationFrame", vi.fn());

const canvasContexts = new WeakMap<
  HTMLCanvasElement,
  CanvasRenderingContext2D
>();

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(function (
    this: HTMLCanvasElement,
    contextId: string,
  ): CanvasRenderingContext2D | null {
    if (contextId !== "2d") {
      return null;
    }

    let context = canvasContexts.get(this);
    if (!context) {
      context = {
        createImageData: vi.fn((width: number, height: number) =>
          new ImageData(width, height),
        ),
        putImageData: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      canvasContexts.set(this, context);
    }

    return context;
  }),
});
