export interface GridPoint {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clientPointToGrid(
  clientX: number,
  clientY: number,
  rect: RectLike,
  gridWidth: number,
  gridHeight: number,
): GridPoint | null {
  if (
    clientX < rect.left ||
    clientY < rect.top ||
    clientX >= rect.left + rect.width ||
    clientY >= rect.top + rect.height
  ) {
    return null;
  }

  return {
    x: Math.min(
      Math.floor(((clientX - rect.left) / rect.width) * gridWidth),
      gridWidth - 1,
    ),
    y: Math.min(
      Math.floor(((clientY - rect.top) / rect.height) * gridHeight),
      gridHeight - 1,
    ),
  };
}

export function interpolateGridLine(
  start: GridPoint,
  end: GridPoint,
): GridPoint[] {
  const points: GridPoint[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = dx - dy;

  while (true) {
    points.push({ x, y });
    if (x === end.x && y === end.y) {
      return points;
    }

    const doubledError = error * 2;
    if (doubledError > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubledError < dx) {
      error += dx;
      y += stepY;
    }
  }
}
