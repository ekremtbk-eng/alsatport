"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

/** One tappable filter line: icon, label, current value (or placeholder) and a chevron. */
export function FilterRow({
  rowKey,
  icon: Icon,
  label,
  value,
  placeholder,
  disabled,
  onOpen,
}: {
  rowKey: string;
  icon: LucideIcon;
  label: string;
  value?: string;
  placeholder: string;
  disabled?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`qf-row ${value ? "is-set" : ""}`}
      data-row={rowKey}
      disabled={disabled}
      onClick={onOpen}
    >
      <span className="qf-row-ico" aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="qf-row-text">
        <span className="qf-row-label">{label}</span>
        <span className="qf-row-val">{value || placeholder}</span>
      </span>
      <ChevronRight className="qf-row-chev h-4 w-4" aria-hidden />
    </button>
  );
}

/** On/off filter line (e.g. "Acil", "Sadece haritalı") without a sub-screen. */
export function FilterSwitchRow({
  rowKey,
  icon: Icon,
  label,
  on,
  onToggle,
}: {
  rowKey: string;
  icon: LucideIcon;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={on} className="qf-row qf-row-switch" data-row={rowKey} onClick={onToggle}>
      <span className="qf-row-ico" aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="qf-row-text">
        <span className="qf-row-label">{label}</span>
      </span>
      <span className={`qf-switch ${on ? "is-on" : ""}`} aria-hidden />
    </button>
  );
}
