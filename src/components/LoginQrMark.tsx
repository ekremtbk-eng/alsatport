"use client";

export function LoginQrMark({ payload }: { payload: string }) {
  const size = 25;
  const modules = buildModules(payload, size);
  const cell = 8;
  const pad = 12;
  const dim = size * cell + pad * 2;
  return (
    <svg viewBox={`0 0 ${dim} ${dim}`} className="login-qr-svg" aria-hidden>
      <rect width={dim} height={dim} rx="12" fill="#fff" />
      {modules.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={pad + x * cell}
              y={pad + y * cell}
              width={cell - 0.6}
              height={cell - 0.6}
              rx="0.8"
              fill="#111827"
            />
          ) : null,
        ),
      )}
      <rect
        x={dim / 2 - 22}
        y={dim / 2 - 22}
        width="44"
        height="44"
        rx="10"
        fill="#fff"
        stroke="#00c853"
        strokeWidth="3"
      />
      <text
        x={dim / 2}
        y={dim / 2 + 6}
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fill="#00c853"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        A
      </text>
    </svg>
  );
}

function buildModules(payload: string, size: number) {
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  paintFinder(grid, 0, 0);
  paintFinder(grid, size - 7, 0);
  paintFinder(grid, 0, size - 7);
  let h = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (reserved(x, y, size)) continue;
      const bit = (Math.imul(h ^ (x * 73 + y * 19), 1103515245) >>> 0) % 5;
      grid[y][x] = bit < 2;
    }
  }
  return grid;
}

function reserved(x: number, y: number, size: number) {
  const inFinder = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
  if (inFinder(0, 0) || inFinder(size - 7, 0) || inFinder(0, size - 7)) return true;
  const cx = Math.floor(size / 2);
  return Math.abs(x - cx) < 3 && Math.abs(y - cx) < 3;
}

function paintFinder(grid: boolean[][], ox: number, oy: number) {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      grid[oy + y][ox + x] = edge || inner;
    }
  }
}
