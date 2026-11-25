// Maze model. Each cell stores its walls as a bitmask.
// The generator builds a "perfect" maze: exactly one route between any two
// cells, so there is a single valid path home and every other branch is a
// dead end.

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const DIRS = [
  { bit: N, dx: 0, dy: -1, opposite: S },
  { bit: E, dx: 1, dy: 0, opposite: W },
  { bit: S, dx: 0, dy: 1, opposite: N },
  { bit: W, dx: -1, dy: 0, opposite: E },
];

export function generateMaze(cols, rows, random = Math.random) {
  const walls = new Uint8Array(cols * rows).fill(N | E | S | W);
  const visited = new Uint8Array(cols * rows);
  const stack = [0];
  visited[0] = 1;

  // Iterative recursive-backtracker (depth-first search).
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const x = current % cols;
    const y = Math.floor(current / cols);

    const options = DIRS.filter((d) => {
      const nx = x + d.dx;
      const ny = y + d.dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny * cols + nx];
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const d = options[Math.floor(random() * options.length)];
    const next = (y + d.dy) * cols + (x + d.dx);
    walls[current] &= ~d.bit;
    walls[next] &= ~d.opposite;
    visited[next] = 1;
    stack.push(next);
  }

  const maze = { cols, rows, walls, start: 0, home: 0 };
  maze.home = farthestCell(maze, maze.start);
  return maze;
}

export function openNeighbors(maze, cell) {
  const { cols, walls } = maze;
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  const result = [];
  for (const d of DIRS) {
    if (!(walls[cell] & d.bit)) result.push((y + d.dy) * cols + (x + d.dx));
  }
  return result;
}

// True when `to` is directly next to `from` with no wall in between.
export function canMove(maze, from, to) {
  return openNeighbors(maze, from).includes(to);
}

// Put home as far from the start as the maze allows, so the route is long.
function farthestCell(maze, from) {
  const dist = new Int32Array(maze.cols * maze.rows).fill(-1);
  const queue = [from];
  dist[from] = 0;
  let farthest = from;
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (dist[cell] > dist[farthest]) farthest = cell;
    for (const n of openNeighbors(maze, cell)) {
      if (dist[n] === -1) {
        dist[n] = dist[cell] + 1;
        queue.push(n);
      }
    }
  }
  return farthest;
}
