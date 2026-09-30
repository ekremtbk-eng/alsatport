"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export function SearchSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  hideLabel,
  anyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  anyLabel?: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return options;
    return options.filter((o) => o.toLocaleLowerCase("tr").includes(s));
  }, [options, q]);

  return (
    <label className={hideLabel ? "block" : "flt-group"}>
      {hideLabel ? <span className="sr-only">{label}</span> : <span className="flt-label">{label}</span>}
      <div className="relative">
        <input
          disabled={disabled}
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
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          className="flt-input pe-9 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
        {open && !disabled && (
          <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-line bg-card py-1 shadow-md">
            {anyLabel ? (
              <li>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-elev"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange("");
                    setQ("");
                    setOpen(false);
                  }}
                >
                  {anyLabel}
                </button>
              </li>
            ) : null}
            {list.length === 0 && (
              <li className="px-3 py-2 text-xs text-ink">Sonuç yok</li>
            )}
            {list.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-elev ${
                    o === value ? "font-semibold" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}
