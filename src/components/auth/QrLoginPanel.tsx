"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Smartphone } from "lucide-react";
import { QrSvg } from "@/components/QrSvg";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import type { UserProfile } from "@/data/store";
import { apiPost } from "@/lib/security/client";

type Phase = "loading" | "ready" | "expired" | "rejected" | "error";

/**
 * Desktop side of QR sign-in: the code encodes a one-time token; a signed-in phone approves it
 * and only this browser (holding the HttpOnly secret cookie) can redeem the session.
 */
export function QrLoginPanel({
  onDone,
}: {
  onDone: (r: { needsProfile: boolean; needsEmailVerify: boolean }) => void;
}) {
  const { adoptSession } = useApp();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [link, setLink] = useState("");
  const [left, setLeft] = useState(0);
  const expiresAt = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const start = useCallback(async () => {
    setPhase("loading");
    const res = await apiPost<{ ok: boolean; token?: string; ttl?: number; error?: string }>("/api/auth/qr/start", {});
    if (!res.ok || !res.token) {
      setPhase("error");
      return;
    }
    setLink(`${window.location.origin}/qr?t=${encodeURIComponent(res.token)}`);
    expiresAt.current = Date.now() + (res.ttl ?? 120000);
    setLeft(Math.ceil((res.ttl ?? 120000) / 1000));
    setPhase("ready");
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (phase !== "ready") return;
    let stop = false;
    const tick = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt.current - Date.now()) / 1000));
      setLeft(remaining);
    }, 1000);
    const poll = async () => {
      while (!stop) {
        await new Promise((r) => setTimeout(r, 2000));
        if (stop) return;
        const res = await apiPost<{
          ok: boolean;
          error?: string;
          status?: string;
          user?: UserProfile;
          needsProfile?: boolean;
          needsEmailVerify?: boolean;
        }>("/api/auth/qr/status", {});
        if (stop) return;
        if (res.status === "approved" && res.user) {
          adoptSession(res.user);
          doneRef.current({ needsProfile: !!res.needsProfile, needsEmailVerify: !!res.needsEmailVerify });
          return;
        }
        if (res.status === "rejected") return setPhase("rejected");
        if (res.status === "expired" || Date.now() > expiresAt.current) return setPhase("expired");
        if (!res.ok && res.status === undefined && res.error !== "auth.err.rateLimit") return setPhase("error");
      }
    };
    void poll();
    return () => {
      stop = true;
      window.clearInterval(tick);
    };
  }, [phase, adoptSession]);

  return (
    <div className="qr-login">
      <div className="qr-login-code">
        {phase === "ready" ? (
          <QrSvg value={link} className="qr-login-svg" label={t("qr.login.aria")} />
        ) : (
          <div className="qr-login-veil">
            {phase === "loading" ? (
              <span className="text-xs text-muted">{t("auth.connecting")}</span>
            ) : (
              <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => void start()}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {t("qr.login.refresh")}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="qr-login-copy">
        <p className="flex items-center gap-1.5 text-sm font-extrabold">
          <Smartphone className="h-4 w-4 text-lime" aria-hidden /> {t("qr.login.h")}
        </p>
        <ol className="qr-login-steps">
          <li>{t("qr.login.s1")}</li>
          <li>{t("qr.login.s2")}</li>
          <li>{t("qr.login.s3")}</li>
        </ol>
        {phase === "ready" ? (
          <p className="text-[11px] text-muted">{t("qr.login.left").replace("{s}", String(left))}</p>
        ) : phase === "expired" ? (
          <p className="text-[11px] font-semibold text-orange">{t("qr.err.expired")}</p>
        ) : phase === "rejected" ? (
          <p className="text-[11px] font-semibold text-orange">{t("qr.login.rejected")}</p>
        ) : phase === "error" ? (
          <p className="text-[11px] font-semibold text-orange">{t("auth.err.server")}</p>
        ) : null}
      </div>
    </div>
  );
}
