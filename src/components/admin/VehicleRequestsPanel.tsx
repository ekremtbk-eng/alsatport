"use client";

import { useCallback, useEffect, useState } from "react";
import { useStepUp } from "@/components/admin/StepUpProvider";
import { useI18n } from "@/context/I18nContext";
import type { AdminVehicleRequest, VehicleRequestStatus } from "@/data/vehicleRequests";
import { apiGet, apiPost } from "@/lib/security/client";

const FILTERS = ["pending", "approved", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

function dateTime(ms?: number | null) {
  return ms ? new Date(ms).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export function VehicleRequestsPanel() {
  const { t } = useI18n();
  const guard = useStepUp();
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<AdminVehicleRequest[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    const res = await apiGet<{ ok?: boolean; requests?: AdminVehicleRequest[]; error?: string }>(
      `/api/admin/vehicle-requests?status=${filter}`,
    ).catch(() => null);
    setRows(res?.requests ?? []);
    if (res && !res.ok) setError(res.error ?? "auth.err.server");
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(row: AdminVehicleRequest, action: "approve" | "reject") {
    setError("");
    const reason = (reasons[row.id] ?? "").trim();
    if (action === "reject" && reason.length < 3) {
      setError("vreq.err.reason");
      return;
    }
    if (action === "approve" && !window.confirm(t("vreq.admin.confirm", { name: `${row.brand} ${row.model}` }))) return;
    setBusy(true);
    const res = await guard(() =>
      apiPost<{ ok?: boolean; error?: string; state?: VehicleRequestStatus }>(`/api/admin/vehicle-requests/${row.id}`, { action, reason }),
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "auth.err.server");
      return;
    }
    await load();
  }

  return (
    <section className="mt-4">
      <p className="text-xs text-muted">{t("vreq.admin.hint")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-bold ${filter === id ? "bg-ink text-white" : "border border-line"}`}
            onClick={() => setFilter(id)}
          >
            {t(`vreq.status.${id}`)}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-orange">{t(error)}</p> : null}
      {rows === null ? (
        <p className="mt-4 text-sm text-muted">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("vreq.admin.empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {[row.brand, row.model, row.series, row.engine].filter(Boolean).join(" · ")}
                </p>
                <span className="text-xs font-semibold text-muted">{t(`vreq.status.${row.status}`)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t(`vreq.seg.${row.segment}`)} ·{" "}
                {row.yearFrom || row.yearTo ? `${row.yearFrom ?? "…"}–${row.yearTo ?? "…"} · ` : ""}@{row.username} ·{" "}
                {dateTime(row.createdAt)}
                {row.reviewedAt ? ` · ${t("vreq.admin.reviewed")}: ${dateTime(row.reviewedAt)}` : ""}
              </p>
              {row.note ? <p className="mt-2 whitespace-pre-line rounded-lg bg-elev p-2 text-xs">{row.note}</p> : null}
              {row.rejectReason ? (
                <p className="mt-2 text-xs text-orange">
                  {t("vreq.admin.reason")}: {row.rejectReason}
                </p>
              ) : null}
              {row.status === "pending" ? (
                <div className="mt-2 space-y-2">
                  <input
                    className="dash-input h-9"
                    maxLength={300}
                    placeholder={t("vreq.admin.reasonPh")}
                    value={reasons[row.id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [row.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} className="biz-btn is-primary" onClick={() => void act(row, "approve")}>
                      {t("vreq.admin.approve")}
                    </button>
                    <button type="button" disabled={busy} className="biz-btn is-danger" onClick={() => void act(row, "reject")}>
                      {t("vreq.admin.reject")}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
