"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TEXT_ENTRY =
  "input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]), textarea, select, [contenteditable=true]";
/** The keyboard counts as open once the visible height is this far below the tallest height seen at this width. */
const KEYBOARD_MIN_PX = 120;
const FIELD_MARGIN = 12;
/** Room a combobox needs below its input for the option list (SearchSelect caps it at 13rem). */
const LIST_ROOM_PX = 220;

function isIOS() {
  const nav = window.navigator;
  return /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

function scrollsY(el: Element) {
  const oy = getComputedStyle(el).overflowY;
  return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
}

function scrollsX(el: Element) {
  const ox = getComputedStyle(el).overflowX;
  return (ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1;
}

/** Nearest box inside the sheet that can actually scroll; the page itself never counts. */
function scrollBoxFrom(el: Element | null, root: HTMLElement) {
  for (let node = el; node && node !== root; node = node.parentElement) {
    if (node instanceof HTMLElement && scrollsY(node)) return node;
  }
  return null;
}

/** What a finger may move inside the sheet: a vertical or sideways scroll box, or a slider thumb. */
function touchTargetFrom(el: Element | null, root: HTMLElement) {
  if (el instanceof HTMLInputElement && el.type === "range") return el;
  for (let node = el; node && node !== root; node = node.parentElement) {
    if (node instanceof HTMLElement && (scrollsY(node) || scrollsX(node))) return node;
  }
  return null;
}

/** Scrolls only the field's own scroll box (scrollIntoView would also move the page on iOS). */
function reveal(el: HTMLElement, root: HTMLElement) {
  const box = scrollBoxFrom(el.parentElement, root);
  if (!box) return;
  const field = el.getBoundingClientRect();
  const view = box.getBoundingClientRect();
  const top = view.top + FIELD_MARGIN;
  const bottom = view.bottom - FIELD_MARGIN;
  const needsList = el.getAttribute("role") === "combobox" && bottom - field.bottom < LIST_ROOM_PX;
  if (field.top < top || needsList) box.scrollTop -= top - field.top;
  else if (field.bottom > bottom) box.scrollTop += field.bottom - bottom;
}

export function FilterSheet({
  open,
  onClose,
  label,
  className = "",
  children,
}: {
  open: boolean;
  onClose?: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!open || !mounted || !root) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const ios = isIOS();
    const vv = window.visualViewport;
    const timers: number[] = [];
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
    body.style.left = `-${scrollX}px`;
    body.style.right = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.touchAction = "none";

    const editing = () => {
      const el = document.activeElement;
      return el instanceof HTMLElement && root.contains(el) && el.matches(TEXT_ENTRY) ? el : null;
    };

    let fullHeight = 0;
    let fullWidth = 0;
    let keyboard = false;
    let shownField: HTMLElement | null = null;
    let shownHeight = 0;

    /** Pins the sheet to the visible area: iOS keeps fixed boxes on the layout viewport while the keyboard is up. */
    const sync = () => {
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      if (Math.abs(width - fullWidth) > 1) {
        fullWidth = width;
        fullHeight = height;
      }
      fullHeight = Math.max(fullHeight, height);
      root.style.top = `${Math.round(vv?.offsetTop ?? 0)}px`;
      root.style.left = `${Math.round(vv?.offsetLeft ?? 0)}px`;
      root.style.right = "auto";
      root.style.width = `${Math.round(width)}px`;
      root.style.height = `${Math.round(height)}px`;
      root.style.maxHeight = `${Math.round(height)}px`;
      root.style.setProperty("--sheet-h", `${Math.round(height)}px`);

      const field = editing();
      const next = Boolean(field) && fullHeight - height > KEYBOARD_MIN_PX;
      root.classList.toggle("is-kb", next);
      if (keyboard !== next && (window.scrollX !== 0 || window.scrollY !== 0)) window.scrollTo(0, 0);
      keyboard = next;
      // Only when focus moves or the keyboard resizes the sheet, so the user can still scroll away from the field.
      if (field && (field !== shownField || Math.abs(height - shownHeight) > 1)) {
        requestAnimationFrame(() => reveal(field, root));
      }
      shownField = field;
      shownHeight = height;
    };
    const later = (ms: number) => timers.push(window.setTimeout(sync, ms));

    /** The page behind is pinned with body{position:fixed}; iOS still scrolls the window toward a focused field. */
    const onWindowScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !root.contains(target) || !target.matches(TEXT_ENTRY)) return;
      if (ios) {
        // Moved out of reach for one frame, Safari finds nothing to scroll to; reveal() then scrolls the sheet body.
        target.style.transform = "translateY(-2000px)";
        requestAnimationFrame(() => {
          target.style.transform = "";
        });
      }
      sync();
      later(120);
      later(350);
    };
    const onBlur = () => {
      later(60);
      later(350);
    };

    let scroller: HTMLElement | null = null;
    const onTouchStart = (event: TouchEvent) => {
      scroller = event.touches.length === 1 && event.target instanceof Element ? touchTargetFrom(event.target, root) : null;
    };
    /** Only boxes that really overflow may move; anything else would drag the whole sheet or the page behind it. */
    const onTouchMove = (event: TouchEvent) => {
      if (!scroller || !scroller.isConnected) event.preventDefault();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCloseRef.current?.();
    };
    const onOrientation = () => {
      later(150);
      later(500);
    };

    sync();
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", onWindowScroll);
    window.addEventListener("orientationchange", onOrientation);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onBlur);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("keydown", onKey);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("orientationchange", onOrientation);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onBlur);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKey);

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
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (opener?.isConnected && !opener.matches(TEXT_ENTRY)) opener.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      className={`filter-sheet fixed z-[140] flex flex-col overflow-hidden overscroll-none ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
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
