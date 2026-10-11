"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";
import type { VehicleSegment } from "@/data/vehicleIndex";
import type { ApprovedVehicle } from "@/data/vehicleRequests";
import { apiGet, apiPost } from "@/lib/security/client";

let approvedPromise: Promise<ApprovedVehicle[]> | null = null;

/** Admin-approved catalog additions, fetched once per page load and only when a vehicle form is shown. */
export function useApprovedVehicles(enabled: boolean) {
  const [rows, setRows] = useState<ApprovedVehicle[]>([]);
  useEffect(() => {
    if (!enabled) return;
    approvedPromise ??= apiGet<{ ok?: boolean; vehicles?: ApprovedVehicle[] }>("/api/vehicle-requests")
      .then((res) => res.vehicles ?? [])
      .catch(() => {
        approvedPromise = null;
        return [];
      });
    let alive = true;
    void approvedPromise.then((list) => {
      if (alive) setRows(list);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return rows;
}

const YEAR_MAX = new Date().getFullYear() + 1;

function yearValue(raw: string) {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 1900 && n <= YEAR_MAX ? n : undefined;
}

/** "Aracım listede yok": sends the missing vehicle to the admin review queue; nothing is added until approved. */
export function VehicleRequestBox({ segment, brand, model }: { segment: VehicleSegment; brand?: string; model?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", series: "", engine: "", yearFrom: "", yearTo: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle() {
    if (!open) setForm((f) => ({ ...f, brand: f.brand || brand || "", model: f.model || model || "" }));
    setOpen((v) => !v);
    setMsg(null);
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key.startsWith("year") ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value }));

  async function submit() {
    setMsg(null);
    if (form.brand.trim().length < 2 || !form.model.trim()) {
      setMsg({ ok: false, text: t("vreq.err.fields") });
      return;
    }
    const yearFrom = yearValue(form.yearFrom);
    const yearTo = yearValue(form.yearTo);
    if ((form.yearFrom && !yearFrom) || (form.yearTo && !yearTo) || (yearFrom && yearTo && yearFrom > yearTo)) {
      setMsg({ ok: false, text: t("vreq.err.years") });
      return;
    }
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/vehicle-requests", {
      segment,
      brand: form.brand.trim(),
      model: form.model.trim(),
      series: form.series.trim() || undefined,
      engine: form.engine.trim() || undefined,
      yearFrom,
      yearTo,
      note: form.note.trim() || undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setMsg({ ok: false, text: t(res?.error ?? "auth.err.server") });
      return;
    }
    setForm({ brand: "", model: "", series: "", engine: "", yearFrom: "", yearTo: "", note: "" });
    setMsg({ ok: true, text: t("vreq.sent") });
  }

  const input = "h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink";
  return (
    <div className="vreq-box">
      <button type="button" className="text-xs font-semibold text-lime underline" aria-expanded={open} onClick={toggle}>
        {t("vreq.open")}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-elev p-3">
          <p className="text-[11px] leading-snug text-muted">{t("vreq.hint")}</p>
          <div className="grid grid-cols-2 gap-2">
            <input className={input} maxLength={60} placeholder={t("vreq.brand")} aria-label={t("vreq.brand")} value={form.brand} onChange={set("brand")} />
            <input className={input} maxLength={80} placeholder={t("vreq.model")} aria-label={t("vreq.model")} value={form.model} onChange={set("model")} />
            <input className={input} maxLength={80} placeholder={t("vreq.series")} aria-label={t("vreq.series")} value={form.series} onChange={set("series")} />
            <input className={input} maxLength={80} placeholder={t("vreq.engine")} aria-label={t("vreq.engine")} value={form.engine} onChange={set("engine")} />
            <input className={input} inputMode="numeric" placeholder={t("vreq.yearFrom")} aria-label={t("vreq.yearFrom")} value={form.yearFrom} onChange={set("yearFrom")} />
            <input className={input} inputMode="numeric" placeholder={t("vreq.yearTo")} aria-label={t("vreq.yearTo")} value={form.yearTo} onChange={set("yearTo")} />
          </div>
          <input className={input} maxLength={300} placeholder={t("vreq.note")} aria-label={t("vreq.note")} value={form.note} onChange={set("note")} />
          {msg ? <p className={`text-xs font-semibold ${msg.ok ? "text-lime" : "text-orange"}`}>{msg.text}</p> : null}
          <button type="button" disabled={busy} className="btn-primary h-10 w-full text-sm" onClick={() => void submit()}>
            {t("vreq.submit")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
