import { useEffect, useRef } from "react";
import { Material } from "../simulation/materials";
import { Simulation } from "../simulation/Simulation";
import {
  clientPointToGrid,
  interpolateGridLine,
  type GridPoint,
} from "./geometry";
import { renderSimulation } from "./renderSimulation";

const DEFAULT_GRID_SIZE = 160;
const BRUSH_RADIUS = 2;
const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 4;

interface SandboxCanvasProps {
  tool: Material;
  paused: boolean;
  clearVersion: number;
  simulation?: Simulation;
}

export function SandboxCanvas({
  tool,
  paused,
  clearVersion,
  simulation,
}: SandboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const previousPointRef = useRef<GridPoint | null>(null);
  const keyboardPointRef = useRef<GridPoint | null>(null);
  const lastClearVersionRef = useRef(clearVersion);

  if (simulationRef.current === null) {
    simulationRef.current =
      simulation ?? new Simulation(DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE);
  }

  const activeSimulation = simulationRef.current;

  if (keyboardPointRef.current === null) {
    keyboardPointRef.current = {
      x: Math.floor(activeSimulation.width / 2),
      y: Math.floor(activeSimulation.height / 2),
    };
  }

  useEffect(() => {
    if (clearVersion === lastClearVersionRef.current) {
      return;
    }

    activeSimulation.clear();
    lastClearVersionRef.current = clearVersion;
  }, [activeSimulation, clearVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const imageData = context.createImageData(
      activeSimulation.width,
      activeSimulation.height,
    );
    let animationFrameId = 0;
    let previousTimestamp: number | null = null;
    let accumulator = 0;

    const animate = (timestamp: number) => {
      if (paused || document.hidden) {
        accumulator = 0;
        previousTimestamp = timestamp;
      } else if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      } else {
        const elapsed = Math.max(0, timestamp - previousTimestamp);
        previousTimestamp = timestamp;
        accumulator = Math.min(
          accumulator + elapsed,
          STEP_MS * MAX_STEPS_PER_FRAME,
        );

        let steps = 0;
        while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
          activeSimulation.step();
          accumulator -= STEP_MS;
          steps += 1;
        }
      }

      renderSimulation(activeSimulation, imageData);
      context.putImageData(imageData, 0, 0);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeSimulation, paused]);

  const pointFromPointer = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): GridPoint | null =>
    clientPointToGrid(
      event.currentTarget.getBoundingClientRect(),
      activeSimulation.width,
      activeSimulation.height,
      event.clientX,
      event.clientY,
    );

  const paintPoint = (point: GridPoint) => {
    activeSimulation.paintCircle(
      point.x,
      point.y,
      BRUSH_RADIUS,
      tool,
    );
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const point = pointFromPointer(event);
    if (!point) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    previousPointRef.current = point;
    paintPoint(point);

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can be unavailable or rejected without ending the stroke.
    }
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    const point = pointFromPointer(event);
    if (!point) {
      previousPointRef.current = null;
      return;
    }

    const previousPoint = previousPointRef.current;
    if (!previousPoint) {
      paintPoint(point);
      previousPointRef.current = point;
      return;
    }

    for (const interpolatedPoint of interpolateGridLine(previousPoint, point)) {
      paintPoint(interpolatedPoint);
    }
    previousPointRef.current = point;
  };

  const resetPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    activePointerIdRef.current = null;
    previousPointRef.current = null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const point = keyboardPointRef.current;
    if (!point) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        point.x = Math.max(0, point.x - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        point.x = Math.min(activeSimulation.width - 1, point.x + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        point.y = Math.max(0, point.y - 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        point.y = Math.min(activeSimulation.height - 1, point.y + 1);
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        paintPoint(point);
        break;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={activeSimulation.width}
      height={activeSimulation.height}
      className="sandbox-canvas"
      aria-label="像素沙盒"
      aria-description="方向键移动笔尖，空格或回车绘制"
      role="application"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetPointer}
      onPointerCancel={resetPointer}
    />
  );
}
