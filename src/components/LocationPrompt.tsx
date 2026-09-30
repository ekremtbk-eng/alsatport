"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";

const FADE_MS = 280;

type Phase = "ask" | "pending" | "ok" | "no";

export function LocationPrompt() {
  const { geo, hydrated, requestLocation, dismissLocationPrompt } = useApp();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [closing, setClosing] = useState(false);
  const dismissRef = useRef(dismissLocationPrompt);
  const closedRef = useRef(false);

  dismissRef.current = dismissLocationPrompt;

  useEffect(() => {
    if (!hydrated) return;
    closedRef.current = false;
    if (geo.dismissed) {
      setPhase(null);
      return;
    }
    if (geo.status === "granted" || (geo.city && geo.status !== "denied")) {
      setPhase("ok");
      return;
    }
    if (geo.status === "denied" || geo.status === "unavailable") {
      setPhase("no");
      return;
    }
    setPhase((p) => (p === "pending" ? p : "ask"));
  }, [hydrated, geo.dismissed, geo.status, geo.city]);

  const finish = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setPhase(null);
    setClosing(false);
    dismissRef.current();
  };

  const closeNow = () => {
    if (closedRef.current || closing) return;
    setClosing(true);
    window.setTimeout(finish, FADE_MS);
  };

  const onAllow = () => {
    setPhase("pending");
    requestLocation();
  };

  if (!phase) return null;

  const copy =
    phase === "ok"
      ? t("loc.ok.body", { city: geo.city || "—" })
      : phase === "no"
        ? t("loc.no")
        : phase === "pending"
          ? t("loc.pending")
          : t("loc.ask");

  const title = phase === "ok" ? t("loc.ok") : null;
  const showAllow = phase === "ask" || phase === "pending";

  return (
    <div className={`loc-banner ${closing ? "loc-banner-out" : ""}`} role="status">
      <div className={`loc-banner-row ${showAllow ? "has-allow" : "is-result"}`}>
        <MapPin className="loc-banner-icon" />
        <div className="loc-banner-copy">
          {title ? <p className="loc-banner-title">{title}</p> : null}
          <p className="loc-banner-text">{copy}</p>
        </div>
        {showAllow ? (
          <button
            type="button"
            className="btn-primary loc-banner-allow"
            onClick={onAllow}
            disabled={phase === "pending"}
          >
            {t("loc.allow")}
          </button>
        ) : null}
        <button type="button" className="loc-banner-x" onClick={closeNow} aria-label={t("common.close")}>
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
