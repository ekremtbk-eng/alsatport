"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/security/client";
import { useI18n } from "@/context/I18nContext";
import { useStepUp } from "@/components/admin/StepUpProvider";

type DayRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  month: number;
  day: number;
  year: number | null;
  durationDays: number;
  active: boolean;
  sortOrder: number;
  theme: string;
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
  live?: boolean;
};

const empty: Omit<DayRow, "id" | "live"> = {
  slug: "",
  name: "",
  kind: "milli",
  month: 1,
  day: 1,
  year: null,
  durationDays: 1,
  active: true,
  sortOrder: 50,
  theme: "milli",
  eyebrow: "",
  title: "",
  body: "",
  closing: "",
  cta: "Teşekkürler",
};

function dateLabel(row: Pick<DayRow, "day" | "month" | "year" | "durationDays">) {
  const start = `${String(row.day).padStart(2, "0")}.${String(row.month).padStart(2, "0")}${
    row.year ? `.${row.year}` : ""
  }`;
  return row.durationDays > 1 ? `${start} · ${row.durationDays} gün` : start;
}

export function SpecialDaysPanel() {
  const { t } = useI18n();
  const [days, setDays] = useState<DayRow[]>([]);
  const [dateKey, setDateKey] = useState("");
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const guard = useStepUp();

  const load = useCallback(async () => {
    const res = await apiGet<{ ok?: boolean; days?: DayRow[]; dateKey?: string }>(
      "/api/admin/special-days",
    );
    setDays(res.days ?? []);
    setDateKey(res.dateKey ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: DayRow) {
    setEditId(row.id);
    setForm({
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      month: row.month,
      day: row.day,
      year: row.year,
      durationDays: row.durationDays,
      active: row.active,
      sortOrder: row.sortOrder,
      theme: row.theme,
      eyebrow: row.eyebrow,
      title: row.title,
      body: row.body,
      closing: row.closing,
      cta: row.cta,
    });
    setError("");
  }

  function reset() {
    setEditId(null);
    setForm(empty);
    setError("");
  }

  async function save() {
    setError("");
    const payload = {
      ...form,
      year: form.year || null,
      theme: form.theme || form.kind,
    };
    const res = editId
      ? await apiPatch<{ ok?: boolean; error?: string }>(`/api/admin/special-days/${editId}`, payload)
      : await guard(() => apiPost<{ ok?: boolean; error?: string }>("/api/admin/special-days", payload));
    if (!res.ok) {
      setError(res.error ?? "auth.err.required");
      return;
    }
    reset();
    await load();
  }

  async function toggle(row: DayRow) {
    await apiPatch(`/api/admin/special-days/${row.id}`, { active: !row.active });
    await load();
  }

  async function remove(id: string) {
    const res = await guard(() => apiDelete<{ ok?: boolean; error?: string }>(`/api/admin/special-days/${id}`));
    if (!res.ok) setError(res.error ?? "auth.err.server");
    if (editId === id) reset();
    await load();
  }

  return (
    <div className="mt-4 space-y-4">
      {dateKey ? (
        <p className="text-xs text-muted">
          {t("admin.days.today")}: {dateKey} (Europe/Istanbul)
        </p>
      ) : null}
      <div className="rounded-xl border border-line bg-card p-4">
        <p className="text-sm font-bold text-ink">{editId ? t("admin.days.edit") : t("admin.days.add")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="dash-input"
            placeholder={t("admin.days.slug")}
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
          />
          <input
            className="dash-input"
            placeholder={t("admin.days.name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select
            className="dash-input"
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value, theme: e.target.value }))}
          >
            <option value="milli">{t("admin.days.kind.milli")}</option>
            <option value="dini">{t("admin.days.kind.dini")}</option>
            <option value="yilbasi">{t("admin.days.kind.yilbasi")}</option>
            <option value="ozel">{t("admin.days.kind.ozel")}</option>
          </select>
          <div className="grid grid-cols-4 gap-2">
            <input
              className="dash-input"
              type="number"
              min={1}
              max={31}
              placeholder="Gün"
              value={form.day}
              onChange={(e) => setForm((f) => ({ ...f, day: Number(e.target.value) }))}
            />
            <input
              className="dash-input"
              type="number"
              min={1}
              max={12}
              placeholder="Ay"
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
            />
            <input
              className="dash-input"
              type="number"
              min={2020}
              max={2100}
              placeholder={t("admin.days.year")}
              value={form.year ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : null }))
              }
            />
            <input
              className="dash-input"
              type="number"
              min={1}
              max={40}
              placeholder={t("admin.days.duration")}
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
            />
          </div>
          <input
            className="dash-input md:col-span-2"
            placeholder={t("admin.days.eyebrow")}
            value={form.eyebrow}
            onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
          />
          <input
            className="dash-input md:col-span-2"
            placeholder={t("admin.days.title")}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="dash-input md:col-span-2 min-h-24"
            placeholder={t("admin.days.body")}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <input
            className="dash-input"
            placeholder={t("admin.days.closing")}
            value={form.closing}
            onChange={(e) => setForm((f) => ({ ...f, closing: e.target.value }))}
          />
          <input
            className="dash-input"
            placeholder={t("admin.days.cta")}
            value={form.cta}
            onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">{t("admin.days.hint")}</p>
        {error ? <p className="mt-2 text-sm font-semibold text-orange">{t(error)}</p> : null}
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary h-9 px-4 text-xs" onClick={() => void save()}>
            {t("admin.days.save")}
          </button>
          {editId ? (
            <button type="button" className="btn-ghost h-9 px-4 text-xs" onClick={reset}>
              {t("common.close")}
            </button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-3">
        {days.length === 0 ? <p className="text-sm text-muted">{t("admin.empty")}</p> : null}
        {days.map((row) => (
          <li key={row.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-ink">
                  {row.name}
                  {row.live ? (
                    <span className="ms-2 rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-lime">
                      {t("admin.days.live")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  {dateLabel(row)} · {row.kind} · {row.year ? t("admin.days.once") : t("admin.days.yearly")}
                  {row.active ? "" : ` · ${t("admin.days.off")}`}
                </p>
                <p className="mt-1 text-sm">{row.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => startEdit(row)}>
                  {t("admin.days.edit")}
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => void toggle(row)}>
                  {row.active ? t("admin.days.off") : t("admin.days.on")}
                </button>
                <button type="button" className="btn-orange h-9 px-3 text-xs" onClick={() => void remove(row.id)}>
                  {t("admin.remove")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
