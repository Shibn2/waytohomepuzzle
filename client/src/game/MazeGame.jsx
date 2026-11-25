import { useCallback, useEffect, useRef, useState } from 'react';
import { generateMaze } from './maze.js';
import { advancePath, isDeadEnd } from './path.js';
import { cellAt, cellCenter, drawScene } from './draw.js';

const LEVELS = {
  easy: { label: 'Easy', size: 7 },
  medium: { label: 'Medium', size: 11 },
  hard: { label: 'Hard', size: 15 },
};

const MESSAGES = {
  idle: 'Press on the player and drag to draw a path home.',
  drawing: 'Keep going. Walls block the line.',
  dead: 'Dead end! Drag back along your line to try another way.',
  won: 'You made it home!',
};

const WALK_MS_PER_CELL = 70;

export default function MazeGame() {
  const [level, setLevel] = useState('easy');
  const [maze, setMaze] = useState(() => generateMaze(LEVELS.easy.size, LEVELS.easy.size));
  const [path, setPath] = useState(() => [maze.start]);
  const [status, setStatus] = useState('idle');
  const [size, setSize] = useState(480);

  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null); // last pointer position while drawing
  const walkRef = useRef(null); // animation frame id
  const pathRef = useRef(path); // latest path, read by pointer handlers
  pathRef.current = path;

  const newMaze = useCallback((nextLevel = level) => {
    const n = LEVELS[nextLevel].size;
    const m = generateMaze(n, n);
    cancelAnimationFrame(walkRef.current);
    setLevel(nextLevel);
    setMaze(m);
    setPath([m.start]);
    setStatus('idle');
  }, [level]);

  const clearPath = () => {
    cancelAnimationFrame(walkRef.current);
    setPath([maze.start]);
    setStatus('idle');
  };

  // Keep the canvas square and as wide as its container (max 600px).
  useEffect(() => {
    const el = wrapperRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setSize(Math.floor(Math.min(entry.contentRect.width, 600)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Redraw whenever the maze, path or size changes.
  const draw = useCallback(
    (playerPos) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, size, maze, path, { status, playerPos });
    },
    [maze, path, size, status],
  );

  useEffect(() => {
    if (status !== 'won') draw();
  }, [draw, status]);

  // Walk the player along the drawn line once it reaches home.
  useEffect(() => {
    if (status !== 'won') return;
    const startTime = performance.now();
    const steps = path.length - 1;
    const tick = (now) => {
      const t = Math.min((now - startTime) / WALK_MS_PER_CELL, steps);
      const i = Math.min(Math.floor(t), steps - 1);
      const [x1, y1] = cellCenter(maze, size, path[i]);
      const [x2, y2] = cellCenter(maze, size, path[i + 1]);
      const f = t - i;
      draw([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f]);
      if (t < steps) walkRef.current = requestAnimationFrame(tick);
    };
    walkRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(walkRef.current);
  }, [status, draw, maze, path, size]);

  const pointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handlePointerDown = (e) => {
    if (status === 'won') return;
    const [x, y] = pointerPos(e);
    const cell = cellAt(maze, size, x, y);
    const onPath = path.indexOf(cell);
    if (onPath === -1) return; // must start on the player or the existing line

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = [x, y];
    const next = path.slice(0, onPath + 1);
    setPath(next);
    setStatus(next.length > 1 && isDeadEnd(maze, next) ? 'dead' : 'drawing');
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const [x, y] = pointerPos(e);
    const [lx, ly] = dragRef.current;
    dragRef.current = [x, y];

    // Sample along the pointer movement so fast drags don't skip cells.
    const step = Math.max(2, size / Math.max(maze.cols, maze.rows) / 4);
    const samples = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / step));
    const current = pathRef.current;
    let next = current;
    for (let i = 1; i <= samples; i++) {
      const cell = cellAt(maze, size, lx + ((x - lx) * i) / samples, ly + ((y - ly) * i) / samples);
      if (cell === -1) continue;
      next = advancePath(maze, next, cell);
      if (next[next.length - 1] === maze.home) break;
    }
    if (next === current) return;

    pathRef.current = next;
    setPath(next);
    if (next[next.length - 1] === maze.home) {
      dragRef.current = null;
      setStatus('won');
    } else {
      setStatus(isDeadEnd(maze, next) ? 'dead' : 'drawing');
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    if (status === 'drawing' && path.length === 1) setStatus('idle');
  };

  return (
    <section className="game">
      <div className="toolbar">
        <div className="levels" role="group" aria-label="Difficulty">
          {Object.entries(LEVELS).map(([key, { label }]) => (
            <button
              key={key}
              className={key === level ? 'active' : ''}
              onClick={() => newMaze(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={clearPath}>Clear line</button>
          <button onClick={() => newMaze()}>New maze</button>
        </div>
      </div>

      <p className={`status status-${status}`} aria-live="polite">
        {MESSAGES[status]}
      </p>

      <div className="board" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Maze. Draw a line from the player to the house."
        />
      </div>

      {status === 'won' && (
        <button className="primary" onClick={() => newMaze()}>
          Play again
        </button>
      )}
    </section>
  );
}
