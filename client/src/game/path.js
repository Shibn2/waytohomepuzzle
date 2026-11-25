import { canMove, openNeighbors } from './maze.js';

// Try to extend the drawn path (a list of cell indexes) into `cell`.
// Moving back onto the previous cell erases the last step.
// Returns the new path, or the same array if the move is blocked by a wall.
export function stepPath(maze, path, cell) {
  const tip = path[path.length - 1];
  if (cell === tip) return path;
  if (path.length > 1 && cell === path[path.length - 2]) return path.slice(0, -1);
  if (!canMove(maze, tip, cell)) return path;

  const existing = path.indexOf(cell);
  if (existing !== -1) return path.slice(0, existing + 1);
  return [...path, cell];
}

// Move the path toward `cell`, which may be diagonal to the tip when the
// pointer cuts a corner. A diagonal is resolved through whichever
// in-between cell is open on both sides.
export function advancePath(maze, path, cell) {
  const tip = path[path.length - 1];
  const { cols } = maze;
  const tx = tip % cols;
  const ty = Math.floor(tip / cols);
  const cx = cell % cols;
  const cy = Math.floor(cell / cols);
  const ax = Math.abs(cx - tx);
  const ay = Math.abs(cy - ty);

  if (ax + ay <= 1) return stepPath(maze, path, cell);

  if (ax === 1 && ay === 1) {
    for (const via of [ty * cols + cx, cy * cols + tx]) {
      if (canMove(maze, tip, via) && canMove(maze, via, cell)) {
        return stepPath(maze, stepPath(maze, path, via), cell);
      }
    }
  }
  return path;
}

// The tip is a dead end when it is not home and has no open way forward.
export function isDeadEnd(maze, path) {
  const tip = path[path.length - 1];
  if (tip === maze.home) return false;
  const previous = path[path.length - 2];
  return openNeighbors(maze, tip).every((n) => n === previous);
}
