"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";

const MIN = 40;
const MAX = 120;

function seedCount() {
  return MIN + Math.floor(Math.random() * (MAX - MIN + 1));
}

let current = seedCount();
const listeners = new Set<(n: number) => void>();
let ticking = false;

function tick() {
  const step = (Math.random() < 0.52 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
  current = Math.min(MAX, Math.max(MIN, current + step));
  listeners.forEach((fn) => fn(current));
}

function subscribeLiveVisitors(fn: (n: number) => void) {
  listeners.add(fn);
  fn(current);
  if (typeof window !== "undefined" && !ticking) {
    ticking = true;
    window.setInterval(tick, 4200 + Math.floor(Math.random() * 2200));
  }
  return () => {
    listeners.delete(fn);
  };
}

export function LiveVisitorsBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => subscribeLiveVisitors(setCount), []);

  if (count == null) return null;

  return (
    <div
      className={compact ? "live-visitors is-header" : "live-visitors"}
      role="status"
      aria-live="polite"
    >
      <span className="live-visitors-pulse" aria-hidden>
        <span className="live-visitors-dot" />
      </span>
      <p className="live-visitors-text">{t(compact ? "home.live.short" : "home.live", { n: count })}</p>
    </div>
  );
}
