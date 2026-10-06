"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { apiPost } from "@/lib/security/client";

type ApiResult = { ok?: boolean; error?: string; status: number };
type Guard = <T extends ApiResult>(run: () => Promise<T>) => Promise<T>;

const StepUpContext = createContext<Guard>((run) => run());

/** Wraps critical admin calls: on `auth.err.stepUp` it asks for a fresh e-mail code, then retries the call once. */
export function useStepUp() {
  return useContext(StepUpContext);
}

export function StepUpProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const settle = useRef<((ok: boolean) => void) | null>(null);

  const send = useCallback(async () => {
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok?: boolean; error?: string; maskedEmail?: string }>("/api/admin/step-up", { action: "start" });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "auth.err.server");
    else setMaskedEmail(res.maskedEmail ?? "");
  }, []);

  const guard = useCallback<Guard>(
    async (run) => {
      const first = await run();
      if (first.error !== "auth.err.stepUp") return first;
      setCode("");
      setError("");
      setMaskedEmail("");
      setOpen(true);
      void send();
      const confirmed = await new Promise<boolean>((resolve) => {
        settle.current = resolve;
      });
      return confirmed ? run() : first;
    },
    [send],
  );

  function close(ok: boolean) {
    setOpen(false);
    settle.current?.(ok);
    settle.current = null;
  }

  async function confirm() {
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/admin/step-up", { action: "confirm", otp: code });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "auth.err.server");
      return;
    }
    close(true);
  }

  return (
    <StepUpContext.Provider value={guard}>
      {children}
      {open ? (
        <div className="legal-modal-overlay" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="stepup-h" className="legal-modal report-modal p-5">
            <h2 id="stepup-h" className="flex items-center gap-2 text-lg font-extrabold text-ink">
              <ShieldCheck className="h-5 w-5 text-lime" aria-hidden />
              {t("admin.stepUp.h")}
            </h2>
            <p className="mt-2 text-sm text-muted">{t("auth.err.stepUp")}</p>
            {maskedEmail ? <p className="mt-2 text-sm">{t("admin.stepUp.p", { email: maskedEmail })}</p> : null}
            <input
              className="dash-input mt-3 w-full text-lg tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label={t("admin.stepUp.h")}
            />
            {error ? (
              <p role="alert" className="mt-2 text-sm text-orange">
                {t(error)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy || code.length !== 6} onClick={() => void confirm()}>
                {t("admin.stepUp.confirm")}
              </button>
              <button type="button" className="btn-ghost h-10 px-4 text-sm" disabled={busy} onClick={() => void send()}>
                {t("admin.stepUp.send")}
              </button>
              <button type="button" className="btn-ghost h-10 px-4 text-sm" onClick={() => close(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StepUpContext.Provider>
  );
}
