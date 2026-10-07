// Fixed lat/long grid. A bbox is one cell; its id doubles as the Redis key
// and the socket room name.

const PREFIX = 'bbox';

function gridSize(cellDeg: number) {
  return {
    nx: Math.round(360 / cellDeg),
    ny: Math.round(180 / cellDeg),
  };
}

export function bboxIdOf(lat: number, long: number, cellDeg: number): string {
  const { nx, ny } = gridSize(cellDeg);
  const x = Math.floor((long + 180) / cellDeg) % nx;
  const y = Math.min(Math.floor((lat + 90) / cellDeg), ny - 1);
  return `${PREFIX}:${x}:${y}`;
}

/** The cell itself plus the (up to) 8 cells around it. */
export function withNeighbours(bboxId: string, cellDeg: number): string[] {
  const { nx, ny } = gridSize(cellDeg);
  const [, xs, ys] = bboxId.split(':');
  const x = Number(xs);
  const y = Number(ys);

  const ids = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    const cy = y + dy;
    if (cy < 0 || cy >= ny) continue;
    for (let dx = -1; dx <= 1; dx++) {
      // wraps around the antimeridian
      const cx = (x + dx + nx) % nx;
      ids.add(`${PREFIX}:${cx}:${cy}`);
    }
  }
  return [...ids];
}
