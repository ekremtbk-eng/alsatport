"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { ProtectedPhoto } from "@/components/ProtectedPhoto";

const MIN = 1;
const MAX = 4.5;
const STEP = 0.35;

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function ListingLightbox({
  images,
  alt,
  index,
  open,
  onClose,
  onIndex,
}: {
  images: string[];
  alt: string;
  index: number;
  open: boolean;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const { t } = useI18n();
  const n = images.length;
  const src = images[index] ?? images[0];
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const apply = useCallback((next: { scale: number; x: number; y: number }) => {
    const s = clamp(next.scale, MIN, MAX);
    const x = s <= 1 ? 0 : next.x;
    const y = s <= 1 ? 0 : next.y;
    view.current = { scale: s, x, y };
    setScale(s);
    setPos({ x, y });
  }, []);

  const resetView = useCallback(() => apply({ scale: 1, x: 0, y: 0 }), [apply]);

  useEffect(() => {
    resetView();
  }, [index, open, resetView]);

  useEffect(() => {
    if (!open) return;
    const el = thumbRefs.current[index];
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index, open]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n < 2) return;
      onIndex((index + dir + n) % n);
    },
    [index, n, onIndex],
  );

  const zoomAt = useCallback(
    (nextScale: number, clientX?: number, clientY?: number) => {
      const s0 = view.current.scale;
      const s1 = clamp(nextScale, MIN, MAX);
      if (s1 === s0) {
        if (s1 <= MIN) apply({ scale: 1, x: 0, y: 0 });
        return;
      }
      const box = stageRef.current?.getBoundingClientRect();
      const cx = clientX ?? (box ? box.left + box.width / 2 : 0);
      const cy = clientY ?? (box ? box.top + box.height / 2 : 0);
      const px = box ? cx - (box.left + box.width / 2) : 0;
      const py = box ? cy - (box.top + box.height / 2) : 0;
      const ratio = s1 / s0;
      apply({
        scale: s1,
        x: px - (px - view.current.x) * ratio,
        y: py - (py - view.current.y) * ratio,
      });
    },
    [apply],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "+" || e.key === "=") zoomAt(view.current.scale + STEP);
      if (e.key === "-" || e.key === "_") zoomAt(view.current.scale - STEP);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, go, zoomAt]);

  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -STEP : STEP;
      zoomAt(view.current.scale + dir, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, zoomAt]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      x: view.current.x,
      y: view.current.y,
      px: e.clientX,
      py: e.clientY,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (view.current.scale > 1.02) {
      apply({ scale: view.current.scale, x: d.x + dx, y: d.y + dy });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      if (view.current.scale <= 1.02 && n > 1) {
        const dx = e.clientX - d.px;
        if (Math.abs(dx) > 56) go(dx < 0 ? 1 : -1);
      }
      return;
    }
    if (view.current.scale <= 1.02) zoomAt(2.2, e.clientX, e.clientY);
    else resetView();
  }

  if (!mounted || !open || !src) return null;

  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="lb-top">
        <div className="lb-zoom">
          <button type="button" className="lb-btn" aria-label={t("list.lb.zoomOut")} onClick={() => zoomAt(view.current.scale - STEP)}>
            <Minus className="h-5 w-5" />
          </button>
          <span className="lb-zoom-pct">{Math.round(scale * 100)}%</span>
          <button type="button" className="lb-btn" aria-label={t("list.lb.zoomIn")} onClick={() => zoomAt(view.current.scale + STEP)}>
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <span className="lb-count">
          {index + 1}/{n}
        </span>
        <button type="button" className="lb-btn lb-close" aria-label={t("list.lb.close")} onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        ref={stageRef}
        className={`lb-stage ${scale > 1.02 ? "is-zoom" : "is-fit"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onAuxClick={(e) => e.preventDefault()}
        onDoubleClick={(e) => {
          e.preventDefault();
          if (view.current.scale > 1.02) resetView();
          else zoomAt(3, e.clientX, e.clientY);
        }}
      >
        <div
          className="lb-frame"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        >
          <ProtectedPhoto src={src} alt={alt} imgClassName="lb-img" />
        </div>
        {n > 1 ? (
          <>
            <button
              type="button"
              className="lb-nav is-prev"
              aria-label={t("list.gal.prev")}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              type="button"
              className="lb-nav is-next"
              aria-label={t("list.gal.next")}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        ) : null}
      </div>

      {n > 1 ? (
        <div className="lb-thumbs">
          {images.map((thumb, i) => (
            <button
              key={`${thumb}-${i}`}
              type="button"
              ref={(node) => {
                thumbRefs.current[i] = node;
              }}
              className={`lb-thumb ${i === index ? "is-on" : ""}`}
              aria-current={i === index ? true : undefined}
              aria-label={`${i + 1} / ${n}`}
              onClick={() => onIndex(i)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <ProtectedPhoto src={thumb} alt="" imgClassName="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
