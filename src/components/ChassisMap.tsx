"use client";

import {
  CHASSIS_PARTS,
  type ChassisStatus,
  nextChassisStatus,
} from "@/data/listingSchema";

const FILL: Record<ChassisStatus, string> = {
  original: "#e8eef2",
  painted: "#f4d03f",
  changed: "#e74c3c",
  local: "#5dade2",
};

const STROKE: Record<ChassisStatus, string> = {
  original: "#94a3b8",
  painted: "#c9a227",
  changed: "#b03a2e",
  local: "#2e86c1",
};

type PartShape = { id: string; d?: string; x: number; y: number; w: number; h: number; rx?: number };

const PARTS: PartShape[] = [
  { id: "frontBumper", x: 78, y: 18, w: 124, h: 26, rx: 10 },
  { id: "hood", x: 88, y: 46, w: 104, h: 78, rx: 10 },
  { id: "roof", x: 92, y: 128, w: 96, h: 118, rx: 8 },
  { id: "trunk", x: 88, y: 250, w: 104, h: 72, rx: 10 },
  { id: "rearBumper", x: 78, y: 326, w: 124, h: 26, rx: 10 },
  { id: "lfFender", x: 38, y: 52, w: 46, h: 62, rx: 8 },
  { id: "lfDoor", x: 38, y: 118, w: 50, h: 78, rx: 8 },
  { id: "lrDoor", x: 38, y: 200, w: 50, h: 72, rx: 8 },
  { id: "lrQuarter", x: 38, y: 276, w: 46, h: 62, rx: 8 },
  { id: "rfFender", x: 196, y: 52, w: 46, h: 62, rx: 8 },
  { id: "rfDoor", x: 192, y: 118, w: 50, h: 78, rx: 8 },
  { id: "rrDoor", x: 192, y: 200, w: 50, h: 72, rx: 8 },
  { id: "rrQuarter", x: 196, y: 276, w: 46, h: 62, rx: 8 },
];

const LEGEND: { status: ChassisStatus; label: string }[] = [
  { status: "original", label: "Orijinal" },
  { status: "painted", label: "Boyalı" },
  { status: "changed", label: "Değişen" },
  { status: "local", label: "Lokal boya" },
];

export function ChassisMap({
  value,
  onChange,
  readOnly,
}: {
  value: Record<string, ChassisStatus>;
  onChange?: (next: Record<string, ChassisStatus>) => void;
  readOnly?: boolean;
}) {
  function click(id: string) {
    if (readOnly || !onChange) return;
    onChange({ ...value, [id]: nextChassisStatus(value[id]) });
  }

  return (
    <div className="chassis-card">
      <div className="chassis-legend">
        {LEGEND.map((item) => (
          <span key={item.status} className="chassis-leg">
            <i style={{ background: FILL[item.status], borderColor: STROKE[item.status] }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="chassis-canvas">
        <svg viewBox="0 0 280 380" className="chassis-svg" role="img" aria-label="Boya / değişen şasi">
          <ellipse cx="70" cy="78" rx="18" ry="28" fill="#1f2937" opacity="0.18" />
          <ellipse cx="210" cy="78" rx="18" ry="28" fill="#1f2937" opacity="0.18" />
          <ellipse cx="70" cy="300" rx="18" ry="28" fill="#1f2937" opacity="0.18" />
          <ellipse cx="210" cy="300" rx="18" ry="28" fill="#1f2937" opacity="0.18" />
          {PARTS.map((p) => {
            const status = value[p.id] ?? "original";
            return (
              <rect
                key={p.id}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={p.rx ?? 8}
                fill={FILL[status]}
                stroke={STROKE[status]}
                strokeWidth="1.6"
                className={readOnly ? "" : "chassis-hit"}
                onClick={() => click(p.id)}
              />
            );
          })}
        </svg>
        <ul className="chassis-list">
          {CHASSIS_PARTS.map((p) => {
            const status = value[p.id] ?? "original";
            const meta = LEGEND.find((l) => l.status === status);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="chassis-row"
                  disabled={readOnly}
                  onClick={() => click(p.id)}
                >
                  <span>{p.label}</span>
                  <em style={{ color: STROKE[status] }}>{meta?.label}</em>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {!readOnly ? (
        <p className="chassis-hint">Parçaya tıklayarak boya / değişen durumunu işaretleyin.</p>
      ) : null}
    </div>
  );
}
