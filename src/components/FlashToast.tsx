"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type FlashKind = "ok" | "err";
type FlashPayload = { message: string; kind?: FlashKind; id?: number };

const FLASH_KEY = "alsatport-flash-v1";

export function showFlashToast(message: string, kind: FlashKind = "ok") {
  const payload: FlashPayload = { message, kind, id: Date.now() };
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<FlashPayload>("alsatport-flash", { detail: payload }));
}

export function FlashToast() {
  const [flash, setFlash] = useState<(FlashPayload & { id: number }) | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FlashPayload;
        if (parsed?.message) setFlash({ id: parsed.id ?? Date.now(), message: parsed.message, kind: parsed.kind ?? "ok" });
      }
    } catch {
      /* ignore */
    }
    const onFlash = (e: Event) => {
      const ce = e as CustomEvent<FlashPayload>;
      if (!ce.detail?.message) return;
      setFlash({ id: ce.detail.id ?? Date.now(), message: ce.detail.message, kind: ce.detail.kind ?? "ok" });
    };
    window.addEventListener("alsatport-flash", onFlash);
    return () => window.removeEventListener("alsatport-flash", onFlash);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(FLASH_KEY);
      } catch {
        /* ignore */
      }
      setFlash(null);
    }, 4800);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!flash) return null;

  return (
    <div className={`flash-toast ${flash.kind === "err" ? "is-err" : "is-ok"}`} role="status">
      {flash.kind === "err" ? <XCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
      <p className="m-0 min-w-0 flex-1 text-sm font-semibold">{flash.message}</p>
      <button
        type="button"
        className="flash-toast-x"
        onClick={() => {
          try {
            sessionStorage.removeItem(FLASH_KEY);
          } catch {
            /* ignore */
          }
          setFlash(null);
        }}
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
