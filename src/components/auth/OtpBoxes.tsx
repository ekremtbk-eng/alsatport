"use client";

import { useEffect, useRef, useState } from "react";

const LEN = 6;

function toCells(value: string) {
  return Array.from({ length: LEN }, (_, i) => value[i] ?? "");
}

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  /** Accessible name prefix per box, e.g. "Doğrulama kodu hanesi" → "… 1". */
  label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [cells, setCells] = useState(() => toCells(value));

  /** Positions are kept locally so clearing a middle box does not shift later digits; external resets still win. */
  useEffect(() => {
    if (value !== cells.join("")) setCells(toCells(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focus(i: number) {
    const el = refs.current[Math.max(0, Math.min(LEN - 1, i))];
    el?.focus();
    el?.select();
  }

  function commit(next: string[]) {
    setCells(next);
    const joined = next.join("");
    onChange(joined);
    return joined;
  }

  /** Writes digits starting at `from`; covers typing, paste and OS autofill (which may drop the whole code into one box). */
  function fill(from: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    const start = incoming.length >= LEN ? 0 : from;
    const next = cells.slice();
    for (let k = 0; k < incoming.length && start + k < LEN; k++) next[start + k] = incoming[k];
    const joined = commit(next);
    if (joined.length === LEN) {
      refs.current.forEach((el) => el?.blur());
      onComplete?.(joined);
      return;
    }
    const gap = next.indexOf("", start);
    focus(gap === -1 ? next.indexOf("") : gap);
  }

  function clearAt(i: number) {
    const next = cells.slice();
    next[i] = "";
    commit(next);
  }

  return (
    <div className={`otp-boxes${invalid ? " is-invalid" : ""}`} role="group" aria-label={label}>
      {cells.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`otp-box${d ? " is-filled" : ""}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? LEN : 2}
          aria-label={`${label} ${i + 1}`}
          value={d}
          disabled={disabled}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.currentTarget.value.replace(/\D/g, "");
            if (!v) {
              if (!e.currentTarget.value) clearAt(i);
              return;
            }
            fill(i, v.length === 2 && d && v.length < LEN ? v.replace(d, "") || v.slice(-1) : v);
          }}
          onPaste={(e) => {
            e.preventDefault();
            fill(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (d) clearAt(i);
              else if (i > 0) {
                clearAt(i - 1);
                focus(i - 1);
              }
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(i + 1);
            }
          }}
        />
      ))}
    </div>
  );
}
