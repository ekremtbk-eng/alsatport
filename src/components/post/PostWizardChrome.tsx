"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export function PostStepper({
  steps,
  current,
  reached,
  onJump,
}: {
  steps: { id: string; label: string }[];
  current: number;
  /** Furthest step the user has opened; earlier steps can be revisited from the dots. */
  reached: number;
  onJump: (index: number) => void;
}) {
  const { t } = useI18n();
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <div className="post-stepper">
      <div className="post-stepper-head">
        <p className="post-stepper-count">{t("post.stepOf", { n: current + 1, total: steps.length })}</p>
        <h2 className="post-stepper-title" data-step-id={steps[current]?.id}>
          {steps[current]?.label}
        </h2>
      </div>
      <ol className="post-stepper-dots" aria-label={t("post.progress")}>
        {steps.map((s, i) => {
          const done = i < current;
          const can = i !== current && i <= reached;
          return (
            <li key={s.id} className={`${done ? "is-done" : ""} ${i === current ? "is-now" : ""}`}>
              <button
                type="button"
                disabled={!can}
                onClick={() => onJump(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`${i + 1}. ${s.label}`}
                title={s.label}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="post-stepper-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const NON_TEXT = new Set(["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image"]);
function isTyping(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLInputElement && !NON_TEXT.has(el.type);
}

/**
 * Back / Continue / Publish bar. On phones it is fixed to the bottom and rides on top of the on-screen
 * keyboard: iOS keeps fixed boxes on the layout viewport, so the bar is lifted by the gap between the layout
 * and the visual viewport; Android (interactive-widget=resizes-content) shrinks the layout itself, the gap is
 * 0 and the bar simply sits above the keyboard. A focused field hidden behind the bar is scrolled into view.
 * SearchSelect lists are portaled above this bar, so reveal only keeps the input itself visible.
 */
export function PostActionBar({ hint, children }: { hint?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    const vv = window.visualViewport;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const gap = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
        bar.style.setProperty("--post-kb", `${gap}px`);
        bar.classList.toggle("is-kb", gap > 80 || isTyping(document.activeElement));
      });
    };
    /** Keeps the focused field between the sticky header and the bar; open option lists position themselves. */
    const reveal = (el: HTMLElement) => {
      if (!el.isConnected || document.activeElement !== el) return;
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const top = Math.max(vv ? vv.offsetTop : 0, header && header.bottom > 0 ? header.bottom : 0);
      const barTop = bar.getBoundingClientRect().top;
      const r = el.getBoundingClientRect();
      if (r.bottom > barTop - 12) window.scrollBy({ top: r.bottom - (barTop - 12) });
      else if (r.top < top + 8) window.scrollBy({ top: r.top - top - 12 });
    };
    let revealTimer = 0;
    const revealSoon = (delay: number) => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        const el = document.activeElement;
        if (isTyping(el) && el.closest(".post-page")) reveal(el);
      }, delay);
    };
    const onFocus = (e: FocusEvent) => {
      update();
      if (isTyping(e.target as Element)) revealSoon(350);
    };
    const onViewport = () => {
      update();
      if (isTyping(document.activeElement)) revealSoon(150);
    };
    const onBlur = () => window.setTimeout(update, 0);
    update();
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", onViewport);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(revealTimer);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", onViewport);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  return (
    <div ref={ref} className="post-bar" data-post-bar>
      {hint ? (
        <p className="post-bar-hint" role="alert">
          {hint}
        </p>
      ) : null}
      <div className="post-bar-actions">{children}</div>
    </div>
  );
}
