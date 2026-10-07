"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/security/client";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { SpecialDaysPanel } from "@/components/admin/SpecialDaysPanel";
import { BusinessApplicationsPanel } from "@/components/admin/BusinessApplicationsPanel";
import { StepUpProvider, useStepUp } from "@/components/admin/StepUpProvider";
import { LEGAL_CONTROLLER_MISSING, LEGAL_CONTROLLER_READY, LEGAL_CONTROLLER_WARNING } from "@/data/legal";
import Link from "next/link";

type Overview = { pending: number; openReports: number; users: number; banned: number };
type AdminListing = {
  id: string;
  title: string;
  sellerName: string;
  city: string;
  moderationStatus?: string;
  postedAt?: number;
  expiresAt?: number;
  soldAt?: number;
};
const LISTING_FILTERS = ["pending", "active", "expired", "passive", "sold", "rejected", "all"] as const;
type ListingFilter = (typeof LISTING_FILTERS)[number];

function adminDate(ms?: number) {
  return ms ? new Date(ms).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}
type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  listingId: string | null;
  listingTitle?: string;
  listingStatus?: string;
  sellerName: string | null;
  sellerBanned: boolean;
  sellerIsAdmin: boolean;
  reporter: string;
  createdAt: string;
};
type ReportPatch = { status: "reviewing" | "resolved" | "dismissed"; removeListing?: boolean; banSeller?: boolean };
type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  bannedAt: string | null;
  displayName: string;
  businessName: string | null;
  businessVerifiedAt: string | null;
};

export default function AdminPage() {
  return (
    <StepUpProvider>
      <AdminConsole />
    </StepUpProvider>
  );
}

function AdminConsole() {
  const { user, hydrated } = useApp();
  const { t } = useI18n();
  const guard = useStepUp();
  const [tab, setTab] = useState<"listings" | "reports" | "users" | "business" | "days">("listings");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingFilter, setListingFilter] = useState<ListingFilter>("pending");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const ov = await apiGet<{ ok?: boolean; error?: string } & Overview>("/api/admin/overview");
    if (!ov.ok) {
      setError(ov.error ?? "auth.err.forbidden");
      return;
    }
    setOverview({ pending: ov.pending, openReports: ov.openReports, users: ov.users, banned: ov.banned });
    const list = await apiGet<{ ok?: boolean; listings?: AdminListing[] }>(`/api/admin/listings?status=${listingFilter}`);
    setListings(list.listings ?? []);
    const reps = await apiGet<{ ok?: boolean; reports?: AdminReport[] }>("/api/admin/reports");
    setReports(reps.reports ?? []);
  }, [listingFilter]);

  useEffect(() => {
    if (hydrated && user?.role === "admin") void load();
  }, [hydrated, user?.role, load]);

  async function moderate(id: string, action: "approve" | "reject" | "remove") {
    const res = await guard(() => apiPost<{ ok?: boolean; error?: string }>(`/api/admin/listings/${id}`, { action }));
    if (!res.ok) setError(res.error ?? "auth.err.server");
    await load();
  }

  async function patchReport(id: string, patch: ReportPatch) {
    const res = await guard(() => apiPatch<{ ok?: boolean; error?: string }>(`/api/admin/reports/${id}`, patch));
    if (!res.ok) setError(res.error ?? "auth.err.server");
    await load();
  }

  async function searchUsers() {
    const res = await apiGet<{ ok?: boolean; users?: AdminUser[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}`,
    );
    setUsers(res.users ?? []);
  }

  async function ban(id: string, banned: boolean) {
    const res = await guard(() => apiPatch<{ ok?: boolean; error?: string }>(`/api/admin/users/${id}`, { banned }));
    if (!res.ok) setError(res.error ?? "auth.err.server");
    await searchUsers();
    await load();
  }

  async function setBusiness(id: string, name: string | null) {
    const trimmed = name?.trim() || null;
    const res = await guard(() =>
      apiPatch<{ ok?: boolean; error?: string }>(`/api/admin/users/${id}`, { business: { name: trimmed, verified: !!trimmed } }),
    );
    if (!res.ok) setError(res.error ?? "auth.err.server");
    await searchUsers();
  }

  if (!hydrated) return <p className="p-8 text-sm text-muted">{t("auth.connecting")}</p>;
  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-extrabold text-ink">{t("admin.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.err.forbidden")}</p>
        <Link href="/" className="mt-4 inline-flex text-sm font-bold text-lime">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-ink">{t("admin.title")}</h1>
      {!LEGAL_CONTROLLER_READY ? (
        <div role="alert" className="mt-4 rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">
          <p className="font-extrabold text-orange">{LEGAL_CONTROLLER_WARNING}</p>
          <p className="mt-1 text-xs text-muted">
            Eksik ortam değişkenleri: <code>{LEGAL_CONTROLLER_MISSING.join(", ")}</code>. Hukuki sayfalarda veri sorumlusu
            bilgisi bu değerler girilene kadar eksik görünür.
          </p>
        </div>
      ) : null}
      {overview ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t("admin.pending")} value={overview.pending} />
          <Stat label={t("admin.reports")} value={overview.openReports} />
          <Stat label={t("admin.users")} value={overview.users} />
          <Stat label={t("admin.banned")} value={overview.banned} />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-orange">{t(error)}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {(["listings", "reports", "users", "business", "days"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? "bg-ink text-white" : "border border-line"}`}
            onClick={() => setTab(id)}
          >
            {t(`admin.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === "listings" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {LISTING_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-bold ${listingFilter === id ? "bg-ink text-white" : "border border-line"}`}
              onClick={() => setListingFilter(id)}
            >
              {t(`admin.lst.${id}`)}
            </button>
          ))}
        </div>
      ) : null}
      {tab === "listings" ? (
        <ul className="mt-4 space-y-3">
          {listings.length === 0 ? <p className="text-sm text-muted">{t("admin.empty")}</p> : null}
          {listings.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card p-4">
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                {row.title}
                {row.moderationStatus ? (
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {t(`admin.lst.${row.moderationStatus}`)}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted">
                {row.sellerName} · {row.city}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {t("admin.lst.publishedAt")}: {adminDate(row.postedAt)} · {t("admin.lst.expiresAt")}: {adminDate(row.expiresAt)}
                {row.soldAt ? ` · ${t("admin.lst.soldAt")}: ${adminDate(row.soldAt)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => void moderate(row.id, "approve")}>
                  {t("admin.approve")}
                </button>
                <button type="button" className="btn-orange h-9 px-3 text-xs" onClick={() => void moderate(row.id, "reject")}>
                  {t("admin.reject")}
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => void moderate(row.id, "remove")}>
                  {t("admin.remove")}
                </button>
                <Link href={`/ilan/${row.id}`} className="grid h-9 place-items-center px-3 text-xs font-bold text-lime">
                  {t("admin.view")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "reports" ? (
        <ul className="mt-4 space-y-3">
          {reports.length === 0 ? <p className="text-sm text-muted">{t("admin.empty")}</p> : null}
          {reports.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card p-4">
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                {t(`report.reason.${row.reason}`)}
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {t(`admin.report.status.${row.status}`)}
                </span>
              </p>
              <p className="text-xs text-muted">
                {row.reporter} · {new Date(row.createdAt).toLocaleString("tr-TR")} ·{" "}
                {row.listingId ? (
                  <Link href={`/ilan/${row.listingId}`} className="font-semibold text-lime">
                    {row.listingTitle || row.listingId}
                  </Link>
                ) : (
                  "—"
                )}
                {row.sellerName ? ` · ${t("admin.report.seller")}: ${row.sellerName}` : ""}
                {row.sellerBanned ? ` (${t("admin.banned")})` : ""}
              </p>
              {row.details ? <p className="mt-1 whitespace-pre-line text-sm">{row.details}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {row.status === "open" ? (
                  <button type="button" className="btn-blue h-9 px-3 text-xs" onClick={() => void patchReport(row.id, { status: "reviewing" })}>
                    {t("admin.report.review")}
                  </button>
                ) : null}
                <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => void patchReport(row.id, { status: "resolved" })}>
                  {t("admin.resolve")}
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => void patchReport(row.id, { status: "dismissed" })}>
                  {t("admin.dismiss")}
                </button>
                {row.listingId && row.listingStatus !== "removed" ? (
                  <button
                    type="button"
                    className="btn-orange h-9 px-3 text-xs"
                    onClick={() => void patchReport(row.id, { status: "resolved", removeListing: true })}
                  >
                    {t("admin.removeListing")}
                  </button>
                ) : null}
                {row.listingId && row.sellerName && !row.sellerBanned && !row.sellerIsAdmin ? (
                  <button
                    type="button"
                    className="btn-orange h-9 px-3 text-xs"
                    onClick={() => {
                      if (window.confirm(t("admin.report.banConfirm"))) {
                        void patchReport(row.id, { status: "resolved", removeListing: true, banSeller: true });
                      }
                    }}
                  >
                    {t("admin.report.ban")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "users" ? (
        <div className="mt-4">
          <div className="flex gap-2">
            <input className="dash-input flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="email / kullanıcı" />
            <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => void searchUsers()}>
              {t("admin.search")}
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {users.map((u) => (
              <li key={u.id} className="rounded-xl border border-line bg-card p-4">
                <p className="font-bold">{u.displayName}</p>
                <p className="text-xs text-muted">
                  {u.email} · @{u.username} · {u.role}
                  {u.bannedAt ? ` · ${t("admin.banned")}` : ""}
                  {u.businessVerifiedAt && u.businessName ? ` · ${t("admin.biz.on")}: ${u.businessName}` : ""}
                </p>
                {u.id !== user.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-orange h-9 px-3 text-xs"
                      onClick={() => void ban(u.id, !u.bannedAt)}
                    >
                      {u.bannedAt ? t("admin.unban") : t("admin.ban")}
                    </button>
                    <form
                      key={`${u.businessName ?? ""}-${u.businessVerifiedAt ?? ""}`}
                      className="flex flex-1 flex-wrap gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const value = new FormData(e.currentTarget).get("biz");
                        void setBusiness(u.id, typeof value === "string" ? value : null);
                      }}
                    >
                      <input
                        name="biz"
                        className="dash-input h-9 min-w-[12rem] flex-1 text-xs"
                        defaultValue={u.businessName ?? ""}
                        placeholder={t("admin.biz.name")}
                        maxLength={120}
                      />
                      <button type="submit" className="btn-primary h-9 px-3 text-xs">
                        {t("admin.biz.verify")}
                      </button>
                      {u.businessVerifiedAt ? (
                        <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => void setBusiness(u.id, null)}>
                          {t("admin.biz.clear")}
                        </button>
                      ) : null}
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "business" ? <BusinessApplicationsPanel /> : null}
      {tab === "days" ? <SpecialDaysPanel /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
