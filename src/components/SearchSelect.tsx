"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

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

/** Places the option list in the visible viewport, above the post bar and below the header when needed. */
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
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
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
    if (!showList) {
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
  }, [showList, list.length, q]);

  const pick = (next: string) => {
    onChange(next);
    setQ("");
    setOpen(false);
  };

  const menu =
    showList && place ? (
      <ul
        id={listId}
        role="listbox"
        data-ss-portal
        data-placement={place.placement}
        className="flt-ss-list fixed z-[80] overflow-auto overscroll-contain rounded-xl border border-line bg-card py-1 shadow-md"
        style={{
          top: place.top,
          left: place.left,
          width: place.width,
          maxHeight: place.maxHeight,
        }}
      >
        {anyLabel ? (
          <li role="option" aria-selected={value === ""}>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-elev"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick("")}
            >
              {anyLabel}
            </button>
          </li>
        ) : null}
        {list.length === 0 && (
          <li className="px-3 py-2 text-xs text-ink">{emptyLabel ?? "Sonuç yok"}</li>
        )}
        {list.map((o) => (
          <li key={o} role="option" aria-selected={o === value}>
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-elev ${
                o === value ? "font-semibold" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
            >
              {o}
              {optionCounts && optionCounts[o] != null ? (
                <span className="float-right text-[11px] text-muted">({optionCounts[o]})</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <label className={hideLabel ? "block" : "flt-group"}>
      {hideLabel ? <span className="sr-only">{label}</span> : <span className="flt-label">{label}</span>}
      <div className="relative">
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
          className="flt-input pe-9 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
        {menu && createPortal(menu, document.body)}
      </div>
    </label>
  );
}
