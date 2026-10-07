"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStepUp } from "@/components/admin/StepUpProvider";
import { StoreLogo } from "@/components/business/StoreBits";
import { catName, useI18n } from "@/context/I18nContext";
import { businessCategoryName, formatBusinessPhone, type AdminBusiness, type BusinessStatusId } from "@/lib/business/shared";
import { apiGet, apiPost } from "@/lib/security/client";

const FILTERS = ["pending", "approved", "rejected", "revoked", "all"] as const;
type Filter = (typeof FILTERS)[number];

function dateTime(ms?: number) {
  return ms ? new Date(ms).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export function BusinessApplicationsPanel() {
  const { t } = useI18n();
  const guard = useStepUp();
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<AdminBusiness[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    const res = await apiGet<{ ok?: boolean; businesses?: AdminBusiness[]; error?: string }>(
      `/api/admin/business?status=${filter}`,
    ).catch(() => null);
    setRows(res?.businesses ?? []);
    if (res && !res.ok) setError(res.error ?? "auth.err.server");
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(row: AdminBusiness, action: "approve" | "reject" | "revoke") {
    setError("");
    if (action === "reject" && reason.trim().length < 3) {
      setError("biz.err.reason");
      return;
    }
    const prompt = action === "approve" ? "biz.admin.confirmApprove" : action === "revoke" ? "biz.admin.confirmRevoke" : "";
    if (prompt && !window.confirm(t(prompt, { name: row.name }))) return;
    setBusy(true);
    const res = await guard(() =>
      apiPost<{ ok?: boolean; error?: string; state?: BusinessStatusId }>(`/api/admin/business/${row.id}`, {
        action,
        reason: reason.trim(),
      }),
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "auth.err.server");
      return;
    }
    setReason("");
    setOpenId(null);
    await load();
  }

  return (
    <section className="mt-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-bold ${filter === id ? "bg-ink text-white" : "border border-line"}`}
            onClick={() => setFilter(id)}
          >
            {id === "all" ? t("biz.f.all") : t(`biz.status.${id}`)}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-orange">{t(error)}</p> : null}
      {rows === null ? (
        <p className="mt-4 text-sm text-muted">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("biz.admin.empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <li key={row.id} className="rounded-xl border border-line bg-card p-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-start"
                  onClick={() => {
                    setOpenId(open ? null : row.id);
                    setReason("");
                    setError("");
                  }}
                  aria-expanded={open}
                >
                  <StoreLogo name={row.name} src={row.logoUrl} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{row.name}</span>
                    <span className="block text-xs text-muted">
                      @{row.username} · {catName(t, row.categoryId, businessCategoryName(row.categoryId))} ·{" "}
                      {[row.district, row.city].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className={`biz-status-pill is-${row.status}`}>{t(`biz.status.${row.status}`)}</span>
                </button>
                {open ? (
                  <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
                    {row.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.coverUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
                    ) : null}
                    <dl className="biz-admin-dl">
                      <dt>{t("biz.f.contactName")}</dt>
                      <dd>{row.contactName}</dd>
                      <dt>{t("biz.f.companyType")}</dt>
                      <dd>{t(`biz.type.${row.companyType}`)}</dd>
                      <dt>{t("biz.f.taxOffice")}</dt>
                      <dd>{row.taxOffice}</dd>
                      <dt>{t("biz.f.taxNumber")}</dt>
                      <dd>{row.taxNumber}</dd>
                      <dt>{t("biz.f.email")}</dt>
                      <dd>{row.email}</dd>
                      <dt>{t("biz.f.phone")}</dt>
                      <dd>{formatBusinessPhone(row.phone)}</dd>
                      <dt>{t("biz.f.website")}</dt>
                      <dd>{row.website || "—"}</dd>
                      <dt>{t("biz.admin.account")}</dt>
                      <dd>
                        @{row.username} · {row.accountEmail}
                      </dd>
                      <dt>{t("biz.admin.submitted")}</dt>
                      <dd>{dateTime(row.submittedAt)}</dd>
                      <dt>{t("biz.admin.reviewed")}</dt>
                      <dd>{dateTime(row.reviewedAt)}</dd>
                      {row.rejectReason ? (
                        <>
                          <dt>{t("biz.reason")}</dt>
                          <dd>{row.rejectReason}</dd>
                        </>
                      ) : null}
                    </dl>
                    <p className="whitespace-pre-line rounded-lg bg-elev p-2">{row.description}</p>
                    {row.status === "approved" ? (
                      <Link href={`/magaza/${row.slug}`} className="text-sm font-semibold text-lime" target="_blank">
                        {t("biz.viewStore")}
                      </Link>
                    ) : null}
                    {row.status === "pending" || row.status === "approved" ? (
                      <div className="space-y-2">
                        <textarea
                          className="dash-input min-h-[4.5rem] py-2"
                          maxLength={500}
                          placeholder={row.status === "pending" ? t("biz.admin.reasonReject") : t("biz.admin.reasonRevoke")}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          {row.status === "pending" ? (
                            <>
                              <button type="button" disabled={busy} className="biz-btn is-primary" onClick={() => void act(row, "approve")}>
                                {t("biz.admin.approve")}
                              </button>
                              <button type="button" disabled={busy} className="biz-btn is-danger" onClick={() => void act(row, "reject")}>
                                {t("biz.admin.reject")}
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={busy} className="biz-btn is-danger" onClick={() => void act(row, "revoke")}>
                              {t("biz.admin.revoke")}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
