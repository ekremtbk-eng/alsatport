"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function FilterSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTouch: body.style.touchAction,
    };

    html.classList.add("filter-sheet-open");
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.touchAction = "none";

    const vv = window.visualViewport;
    const syncViewport = () => {
      const node = rootRef.current;
      if (!node) return;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const top = Math.round(vv?.offsetTop ?? 0);
      node.style.top = `${top}px`;
      node.style.height = `${height}px`;
      node.style.maxHeight = `${height}px`;
    };

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        event.preventDefault();
        return;
      }
      if (target.closest("[data-filter-scroll]")) return;
      event.preventDefault();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    syncViewport();
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("keydown", onKey);

    return () => {
      html.classList.remove("filter-sheet-open");
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.height = prev.bodyHeight;
      body.style.touchAction = prev.bodyTouch;
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKey);
      window.scrollTo(0, scrollY);
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="filter-sheet fixed inset-0 z-[140] flex flex-col overflow-hidden overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        className="filter-sheet-backdrop absolute inset-0 z-0"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="filter-sheet-card relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {children}
      </div>
    </div>,
    document.body,
  );
}
