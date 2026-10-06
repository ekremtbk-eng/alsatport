"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Monitor, ShieldAlert, XCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { apiGet, apiPost } from "@/lib/security/client";

type Phase = "loading" | "ask" | "approved" | "rejected" | "invalid";

function QrApprove() {
  const { user } = useApp();
  const { t } = useI18n();
  const token = useSearchParams().get("t") ?? "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [agent, setAgent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
      setPhase("invalid");
      return;
    }
    void apiGet<{ ok: boolean; agent?: string; error?: string }>(`/api/auth/qr/approve?t=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          setError(res.error ?? "qr.err.expired");
          setPhase("invalid");
          return;
        }
        setAgent(res.agent ?? "");
        setPhase("ask");
      })
      .catch(() => setPhase("invalid"));
  }, [user, token]);

  async function answer(approve: boolean) {
    setBusy(true);
    const res = await apiPost<{ ok: boolean; error?: string }>("/api/auth/qr/approve", { t: token, approve });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "qr.err.expired");
      setPhase("invalid");
      return;
    }
    setPhase(approve ? "approved" : "rejected");
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <h1 className="mb-3 text-lg font-extrabold">{t("qr.approve.h")}</h1>
      {phase === "loading" ? (
        <p className="text-sm text-muted">{t("auth.connecting")}</p>
      ) : phase === "ask" ? (
        <>
          <div className="acct-status mb-3">
            <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-lime" aria-hidden />
            <div>
              <p className="text-sm font-extrabold">{agent || t("qr.approve.device")}</p>
              <p className="text-xs text-muted">{t("qr.approve.as").replace("{name}", user?.displayName ?? "")}</p>
            </div>
          </div>
          <p className="mb-4 flex items-start gap-2 text-xs text-muted">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden /> {t("qr.approve.warn")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="chip h-11 justify-center" disabled={busy} onClick={() => void answer(false)}>
              {t("qr.approve.no")}
            </button>
            <button type="button" className="btn-primary h-11" disabled={busy} onClick={() => void answer(true)}>
              {t("qr.approve.yes")}
            </button>
          </div>
        </>
      ) : phase === "approved" ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-lime">
          <CheckCircle2 className="h-5 w-5" aria-hidden /> {t("qr.approve.done")}
        </p>
      ) : phase === "rejected" ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <XCircle className="h-5 w-5 text-orange" aria-hidden /> {t("qr.approve.rejected")}
        </p>
      ) : (
        <p className="text-sm font-semibold text-orange">{t(error || "qr.err.invalid")}</p>
      )}
      <Link href="/" className="dash-link mt-4 inline-block text-sm">
        {t("auth.gate.home")}
      </Link>
    </div>
  );
}

export default function QrPage() {
  return (
    <Suspense fallback={null}>
      <QrApprove />
    </Suspense>
  );
}
