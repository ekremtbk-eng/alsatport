"use client";

import Link from "next/link";
import { FormEvent, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { catName, useI18n } from "@/context/I18nContext";
import { findCategory, hrefForCategoryListings, parentOf } from "@/data/categories";
import { SMART_HINTS, type SmartChip, type SmartHint } from "@/lib/smartSearch/hints";

const MAX_LEN = 200;
const HINTS = Object.keys(SMART_HINTS) as SmartHint[];

type Outcome =
  | { kind: "results"; url: string; count: number; chips: SmartChip[] }
  | { kind: "refused" | "unavailable" | "rate" | "empty" };

function safeHref(url: unknown) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") ? url : null;
}

export function SmartSearch({ variant = "hero" }: { variant?: "hero" | "phone" }) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hint, setHint] = useState<SmartHint | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const text = q.trim();
    if (!text) {
      const cat = hint ? findCategory(SMART_HINTS[hint]) : undefined;
      if (cat) router.push(hrefForCategoryListings(cat));
      else {
        setOutcome({ kind: "empty" });
        inputRef.current?.focus();
      }
      return;
    }
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/smart-search", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hint ? { q: text, hint } : { q: text }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const url = safeHref(data?.url);
      if (res.ok && data?.kind === "results" && url) {
        setOutcome({
          kind: "results",
          url,
          count: Math.max(0, Number(data.count) || 0),
          chips: Array.isArray(data.chips) ? (data.chips as SmartChip[]) : [],
        });
      } else if (data?.kind === "refused") setOutcome({ kind: "refused" });
      else if (res.status === 429) setOutcome({ kind: "rate" });
      else if (res.status === 400) setOutcome({ kind: "empty" });
      else setOutcome({ kind: "unavailable" });
    } catch {
      setOutcome({ kind: "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  function chipText(chip: SmartChip) {
    if (chip.labelKey === "ai.lbl.cat" && chip.value) {
      const cat = findCategory(chip.value);
      if (!cat) return "";
      const parent = parentOf(cat);
      const own = catName(t, cat.id, cat.name);
      return parent?.parentId ? `${catName(t, parent.id, parent.name)} › ${own}` : own;
    }
    if (chip.min || chip.max) {
      const fmt = (v?: string) => {
        if (!v) return "";
        const n = Number(v);
        const base = chip.unit && Number.isFinite(n) ? n.toLocaleString("tr-TR") : v;
        return chip.unit === "try" ? `${base} ₺` : chip.unit === "km" ? `${base} km` : chip.unit === "sqm" ? `${base} m²` : base;
      };
      if (chip.min && chip.max) return chip.min === chip.max ? fmt(chip.min) : `${fmt(chip.min)} – ${fmt(chip.max)}`;
      return chip.min ? `${fmt(chip.min)}+` : `≤ ${fmt(chip.max)}`;
    }
    return chip.value ?? "";
  }

  const fallbackHref = q.trim() ? `/ara?q=${encodeURIComponent(q.trim().slice(0, 80))}` : "/ara";

  return (
    <section className={`hp-ai hp-ai--${variant}`} aria-labelledby={titleId}>
      <div className="hp-ai-head">
        <h2 id={titleId} className="hp-ai-title">
          {t("ai.title")}
        </h2>
        <p className="hp-ai-sub">{t("ai.sub")}</p>
      </div>
      <form className="hp-ai-form" onSubmit={submit} role="search">
        <Sparkles className="hp-ai-ico" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          placeholder={t(hint ? `ai.ph.${hint}` : variant === "phone" ? "ai.ph.short" : "ai.ph")}
          aria-label={t("ai.input")}
          enterKeyHint="search"
          autoComplete="off"
        />
        <button type="submit" className="hp-ai-go" disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          <span>{busy ? t("ai.loading") : t("ai.go")}</span>
        </button>
      </form>
      <div className="hp-ai-chips" role="group" aria-label={t("ai.title")}>
        {HINTS.map((h) => (
          <button
            key={h}
            type="button"
            className={hint === h ? "is-on" : ""}
            aria-pressed={hint === h}
            onClick={() => {
              setHint((cur) => (cur === h ? null : h));
              setOutcome(null);
              inputRef.current?.focus();
            }}
          >
            {t(`ai.chip.${h}`)}
          </button>
        ))}
      </div>
      <div className="hp-ai-out" aria-live="polite">
        {outcome?.kind === "results" ? (
          <div className="hp-ai-result">
            <p className="hp-ai-understood">{t("ai.understood")}</p>
            <ul className="hp-ai-tags">
              {outcome.chips.map((chip, i) => {
                const text = chipText(chip);
                const label = t(chip.labelKey);
                return text ? (
                  <li key={`${chip.labelKey}-${i}`}>
                    {label !== chip.labelKey ? <span>{label}</span> : null}
                    <b>{text}</b>
                  </li>
                ) : null;
              })}
            </ul>
            <div className="hp-ai-foot">
              <strong className="hp-ai-count">
                {outcome.count > 0 ? t("ai.count", { n: outcome.count.toLocaleString("tr-TR") }) : t("ai.none")}
              </strong>
              <Link href={outcome.url} className="hp-ai-view">
                {t("ai.view")} →
              </Link>
            </div>
          </div>
        ) : outcome?.kind === "refused" ? (
          <p className="hp-ai-note">{t("ai.refused")}</p>
        ) : outcome?.kind === "unavailable" ? (
          <p className="hp-ai-note is-warn">
            {t("ai.unavailable")} <Link href={fallbackHref}>{t("ai.normal")} →</Link>
          </p>
        ) : outcome?.kind === "rate" ? (
          <p className="hp-ai-note is-warn">{t("auth.err.rateLimit")}</p>
        ) : outcome?.kind === "empty" ? (
          <p className="hp-ai-note">{t("ai.empty")}</p>
        ) : null}
      </div>
    </section>
  );
}
