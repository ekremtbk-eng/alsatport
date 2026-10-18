"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { CategoryIcon } from "@/components/CategoryIcon";

const LIST_MAX = 208;
const LIST_MIN = 84;
const LIST_GAP = 4;

type Place = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "above" | "below";
};

/**
 * Places a floating option list in the visible viewport (filters / toolbars).
 * Listing forms use menuMode="inline" instead so the list expands layout and never covers other fields.
 */
function placeList(anchor: HTMLElement): Place {
  const r = anchor.getBoundingClientRect();
  const vv = window.visualViewport;
  const viewTop = vv ? vv.offsetTop : 0;
  const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const viewLeft = vv ? vv.offsetLeft : 0;
  const viewWidth = vv ? vv.width : window.innerWidth;

  const bar = document.querySelector<HTMLElement>("[data-post-bar]");
  const barTop = bar ? Math.min(bar.getBoundingClientRect().top, viewBottom) : viewBottom;
  const header = document.querySelector(".site-header")?.getBoundingClientRect();
  const headBottom = Math.max(viewTop, header && header.bottom > viewTop ? header.bottom : viewTop);

  const width = Math.max(0, Math.min(r.width, viewWidth - 16));
  const left = Math.min(Math.max(r.left, viewLeft + 8), viewLeft + viewWidth - width - 8);

  const spaceBelow = Math.max(0, barTop - r.bottom - LIST_GAP - 8);
  const spaceAbove = Math.max(0, r.top - headBottom - LIST_GAP - 8);
  const openAbove = spaceBelow < LIST_MIN && spaceAbove > spaceBelow;

  if (openAbove) {
    const maxHeight = Math.max(LIST_MIN, Math.min(LIST_MAX, spaceAbove || LIST_MIN));
    return {
      top: Math.max(headBottom + 8, r.top - LIST_GAP - maxHeight),
      left,
      width,
      maxHeight,
      placement: "above",
    };
  }

  const maxHeight = Math.max(LIST_MIN, Math.min(LIST_MAX, spaceBelow || LIST_MIN));
  return { top: r.bottom + LIST_GAP, left, width, maxHeight, placement: "below" };
}

export type SearchSelectVisual = "brand" | "category" | "none";

export function SearchSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  hideLabel,
  anyLabel,
  emptyLabel,
  optionCounts,
  menuMode = "portal",
  visual = "none",
  optionIcons,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  anyLabel?: string;
  emptyLabel?: string;
  optionCounts?: Record<string, number>;
  /**
   * portal — floating list (filters, toolbars). Default.
   * inline — list stays in document flow under the field so the form row grows instead of covering siblings
   *          (listing wizard / DynamicAttributeForm).
   */
  menuMode?: "portal" | "inline";
  /** brand — BrandMark beside options; category — CategoryIcon via optionIcons map */
  visual?: SearchSelectVisual;
  /** Maps option label → CategoryIcon name when visual="category" */
  optionIcons?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const inline = menuMode === "inline";
  const showVisual = visual === "brand" || visual === "category";
  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return options.filter((o) => {
      if (s && !o.toLocaleLowerCase("tr").includes(s)) return false;
      if (!optionCounts) return true;
      if (o === value) return true;
      return (optionCounts[o] ?? 0) > 0;
    });
  }, [options, q, optionCounts, value]);

  useEffect(() => setMounted(true), []);

  const showList = open && !disabled && mounted;

  useLayoutEffect(() => {
    if (!showList || inline) {
      setPlace(null);
      return;
    }
    const anchor = inputRef.current;
    if (!anchor) return;
    const update = () => setPlace(placeList(anchor));
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showList, inline, list.length, q]);

  /** After an inline list mounts, keep the input + list above the sticky post bar. */
  useLayoutEffect(() => {
    if (!showList || !inline) return;
    const input = inputRef.current;
    if (!input) return;
    const run = () => {
      const listEl = document.getElementById(listId);
      const bar = document.querySelector<HTMLElement>("[data-post-bar]");
      if (!listEl || !bar) return;
      const vv = window.visualViewport;
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const top = Math.max(vv ? vv.offsetTop : 0, header && header.bottom > 0 ? header.bottom : 0);
      const barTop = bar.getBoundingClientRect().top;
      const bottom = listEl.getBoundingClientRect().bottom;
      const topEdge = input.getBoundingClientRect().top;
      if (bottom > barTop - 12) window.scrollBy({ top: bottom - (barTop - 12) });
      else if (topEdge < top + 8) window.scrollBy({ top: topEdge - top - 12 });
    };
    const t = window.setTimeout(run, 50);
    return () => window.clearTimeout(t);
  }, [showList, inline, listId, list.length]);

  const pick = (next: string) => {
    onChange(next);
    setQ("");
    setOpen(false);
  };

  const optionVisual = (o: string) => {
    if (visual === "brand") return <BrandMark label={o} size={18} />;
    if (visual === "category") {
      const icon = optionIcons?.[o] ?? "grid";
      return (
        <span className="ss-cat-ico" aria-hidden="true">
          <CategoryIcon name={icon} className="h-4 w-4" />
        </span>
      );
    }
    return null;
  };

  const optionsBody = (
    <>
      {anyLabel ? (
        <li role="option" aria-selected={value === ""}>
          <button
            type="button"
            className="ss-opt"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("")}
          >
            {showVisual ? <span className="ss-opt-mark ss-opt-mark-empty" aria-hidden="true" /> : null}
            <span className="ss-opt-label">{anyLabel}</span>
          </button>
        </li>
      ) : null}
      {list.length === 0 && <li className="px-3 py-2 text-xs text-ink">{emptyLabel ?? "Sonuç yok"}</li>}
      {list.map((o) => (
        <li key={o} role="option" aria-selected={o === value}>
          <button
            type="button"
            className={`ss-opt ${o === value ? "is-on" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(o)}
          >
            {showVisual ? <span className="ss-opt-mark">{optionVisual(o)}</span> : null}
            <span className="ss-opt-label">{o}</span>
            {optionCounts && optionCounts[o] != null ? (
              <span className="ss-opt-count">({optionCounts[o]})</span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  );

  const portalMenu =
    !inline && showList && place ? (
      <ul
        id={listId}
        role="listbox"
        data-ss-portal
        data-placement={place.placement}
        data-visual={visual}
        className="flt-ss-list fixed z-[80] overflow-auto overscroll-contain rounded-xl border border-line bg-card py-1 shadow-md"
        style={{
          top: place.top,
          left: place.left,
          width: place.width,
          maxHeight: place.maxHeight,
        }}
      >
        {optionsBody}
      </ul>
    ) : null;

  const inlineMenu =
    inline && showList ? (
      <ul
        id={listId}
        role="listbox"
        data-ss-inline
        data-placement="below"
        data-visual={visual}
        className="flt-ss-list flt-ss-list-inline mt-1 mb-1 w-full overflow-auto overscroll-contain rounded-xl border border-line bg-panel py-1"
      >
        {optionsBody}
      </ul>
    ) : null;

  return (
    <label className={hideLabel ? "block" : "flt-group"}>
      {hideLabel ? <span className="sr-only">{label}</span> : <span className="flt-label">{label}</span>}
      <div className={inline ? "ss-inline-wrap" : "relative"}>
        <div className={`relative ${showVisual ? "ss-has-mark" : ""}`}>
          {showVisual && value && !open ? (
            <span className="ss-input-mark" aria-hidden="true">
              {optionVisual(value)}
            </span>
          ) : null}
          <input
            ref={inputRef}
            disabled={disabled}
            role="combobox"
            aria-expanded={showList}
            aria-controls={showList ? listId : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            value={open ? q : value}
            placeholder={placeholder ?? "Seçiniz veya yazın..."}
            onFocus={() => {
              if (disabled) return;
              setQ("");
              setOpen(true);
            }}
            onChange={(e) => {
              if (disabled) return;
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              // First Escape closes the list; FilterSheet ignores handled keys, so only the next one closes the sheet.
              if (e.key === "Escape" && open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 160)}
            className={`flt-input pe-9 disabled:cursor-not-allowed disabled:opacity-50 ${showVisual ? "ss-input-visual" : ""}`}
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
        </div>
        {inlineMenu}
      </div>
      {portalMenu && createPortal(portalMenu, document.body)}
    </label>
  );
}
