import { N, E, S, W } from './maze.js';

const COLORS = {
  grass: '#7cb35b',
  floor: '#efe4c8',
  wall: '#4e5b31',
  path: '#e5533d',
  pathDead: '#8a8a8a',
  pathDone: '#2f9e44',
  skin: '#f1c27d',
  shirt: '#1c7ed6',
  roof: '#c92a2a',
  house: '#fff3bf',
  door: '#7b4a26',
};

// Draw the whole scene. `size` is in CSS pixels; the context is already
// scaled for the device pixel ratio. `playerPos` is an optional [x, y]
// used while the player walks home; otherwise the player stands at start.
export function drawScene(ctx, size, maze, path, { status, playerPos }) {
  const { cols, rows, walls } = maze;
  const pad = size * 0.03;
  const cell = (size - pad * 2) / Math.max(cols, rows);
  const wallWidth = Math.max(3, cell * 0.16);
  const center = (index) => [
    pad + (index % cols) * cell + cell / 2,
    pad + Math.floor(index / cols) * cell + cell / 2,
  ];

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(pad, pad, cols * cell, rows * cell);

  // Walls along the sides of the pathways.
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = wallWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const w = walls[y * cols + x];
      const left = pad + x * cell;
      const top = pad + y * cell;
      if (w & N) line(ctx, left, top, left + cell, top);
      if (w & W) line(ctx, left, top, left, top + cell);
      if (x === cols - 1 && w & E) line(ctx, left + cell, top, left + cell, top + cell);
      if (y === rows - 1 && w & S) line(ctx, left, top + cell, left + cell, top + cell);
    }
  }
  ctx.stroke();

  drawHome(ctx, ...center(maze.home), cell);

  // The line the player has drawn.
  if (path.length > 1) {
    ctx.strokeStyle =
      status === 'won' ? COLORS.pathDone : status === 'dead' ? COLORS.pathDead : COLORS.path;
    ctx.lineWidth = cell * 0.22;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    path.forEach((index, i) => {
      const [px, py] = center(index);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  const [px, py] = playerPos ?? center(maze.start);
  drawPlayer(ctx, px, py, cell);
}

// Centre of a cell in CSS pixels.
export function cellCenter(maze, size, index) {
  const pad = size * 0.03;
  const cell = (size - pad * 2) / Math.max(maze.cols, maze.rows);
  return [pad + (index % maze.cols) * cell + cell / 2, pad + Math.floor(index / maze.cols) * cell + cell / 2];
}

// Convert a pointer position (CSS pixels) to a cell index, or -1 if outside.
export function cellAt(maze, size, x, y) {
  const pad = size * 0.03;
  const cell = (size - pad * 2) / Math.max(maze.cols, maze.rows);
  const cx = Math.floor((x - pad) / cell);
  const cy = Math.floor((y - pad) / cell);
  if (cx < 0 || cy < 0 || cx >= maze.cols || cy >= maze.rows) return -1;
  return cy * maze.cols + cx;
}

function line(ctx, x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function drawPlayer(ctx, x, y, cell) {
  const r = cell * 0.36;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.2, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shoulders (top view)
  ctx.fillStyle = COLORS.shirt;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // Hair
  ctx.fillStyle = '#3b2a1a';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.08, r * 0.38, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawHome(ctx, x, y, cell) {
  const s = cell * 0.7;
  // Base
  ctx.fillStyle = COLORS.house;
  ctx.fillRect(x - s / 2, y - s * 0.1, s, s * 0.55);
  // Roof
  ctx.fillStyle = COLORS.roof;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.62, y - s * 0.05);
  ctx.lineTo(x, y - s * 0.55);
  ctx.lineTo(x + s * 0.62, y - s * 0.05);
  ctx.closePath();
  ctx.fill();
  // Door
  ctx.fillStyle = COLORS.door;
  ctx.fillRect(x - s * 0.1, y + s * 0.15, s * 0.2, s * 0.3);
}
