"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/security/client";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import Link from "next/link";

type Overview = { pending: number; openReports: number; users: number; banned: number };
type AdminListing = {
  id: string;
  title: string;
  sellerName: string;
  city: string;
  moderationStatus?: string;
};
type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  listingId: string | null;
  listingTitle?: string;
  reporter: string;
};
type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  bannedAt: string | null;
  displayName: string;
};

export default function AdminPage() {
  const { user, hydrated } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"listings" | "reports" | "users">("listings");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
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
    const list = await apiGet<{ ok?: boolean; listings?: AdminListing[] }>("/api/admin/listings?status=pending");
    setListings(list.listings ?? []);
    const reps = await apiGet<{ ok?: boolean; reports?: AdminReport[] }>("/api/admin/reports");
    setReports(reps.reports ?? []);
  }, []);

  useEffect(() => {
    if (hydrated && user?.role === "admin") void load();
  }, [hydrated, user?.role, load]);

  async function moderate(id: string, action: "approve" | "reject" | "remove") {
    await apiPost(`/api/admin/listings/${id}`, { action });
    await load();
  }

  async function patchReport(id: string, status: "resolved" | "dismissed", removeListing?: boolean) {
    await apiPatch(`/api/admin/reports/${id}`, { status, removeListing });
    await load();
  }

  async function searchUsers() {
    const res = await apiGet<{ ok?: boolean; users?: AdminUser[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}`,
    );
    setUsers(res.users ?? []);
  }

  async function ban(id: string, banned: boolean) {
    await apiPatch(`/api/admin/users/${id}`, { banned });
    await searchUsers();
    await load();
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
      {overview ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t("admin.pending")} value={overview.pending} />
          <Stat label={t("admin.reports")} value={overview.openReports} />
          <Stat label={t("admin.users")} value={overview.users} />
          <Stat label={t("admin.banned")} value={overview.banned} />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-orange">{t(error)}</p> : null}

      <div className="mt-6 flex gap-2">
        {(["listings", "reports", "users"] as const).map((id) => (
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
        <ul className="mt-4 space-y-3">
          {listings.length === 0 ? <p className="text-sm text-muted">{t("admin.empty")}</p> : null}
          {listings.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card p-4">
              <p className="font-bold text-ink">{row.title}</p>
              <p className="text-xs text-muted">
                {row.sellerName} · {row.city} · {row.moderationStatus}
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
              <p className="font-bold text-ink">{row.reason}</p>
              <p className="text-xs text-muted">
                {row.reporter} · {row.listingTitle || row.listingId || "—"}
              </p>
              {row.details ? <p className="mt-1 text-sm">{row.details}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => void patchReport(row.id, "resolved")}>
                  {t("admin.resolve")}
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => void patchReport(row.id, "dismissed")}>
                  {t("admin.dismiss")}
                </button>
                {row.listingId ? (
                  <button
                    type="button"
                    className="btn-orange h-9 px-3 text-xs"
                    onClick={() => void patchReport(row.id, "resolved", true)}
                  >
                    {t("admin.removeListing")}
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
                </p>
                {u.id !== user.id ? (
                  <button
                    type="button"
                    className="btn-orange mt-2 h-9 px-3 text-xs"
                    onClick={() => void ban(u.id, !u.bannedAt)}
                  >
                    {u.bannedAt ? t("admin.unban") : t("admin.ban")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
