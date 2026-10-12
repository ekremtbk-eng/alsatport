"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { regionNamesFor } from "@/data/locations";
import type { GeoState } from "@/lib/notify";

const FADE_MS = 280;
/** Holds only "the user closed the banner" (no coordinates), so a closed banner stays closed without the functional-cookie opt-in. */
const CLOSED_KEY = "alsatport-loc-prompt-v1";

type Phase = "ask" | "pending" | "ok" | "manual" | "denied" | "timeout" | "error" | "na";

const FAILED: Partial<Record<GeoState["status"], Phase>> = {
  denied: "denied",
  timeout: "timeout",
  error: "error",
  unavailable: "na",
};

const COPY: Record<Exclude<Phase, "ok" | "manual">, string> = {
  ask: "loc.ask",
  pending: "loc.pending",
  denied: "loc.no",
  timeout: "loc.timeout",
  error: "loc.err",
  na: "loc.na",
};

function closedBefore() {
  try {
    return !!localStorage.getItem(CLOSED_KEY);
  } catch {
    return false;
  }
}

function rememberClosed() {
  try {
    localStorage.setItem(CLOSED_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* private mode */
  }
}

/** The browser already refused for this site: asking again cannot show a prompt, so do not nag. */
async function permissionBlocked() {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return status?.state === "denied";
  } catch {
    return false;
  }
}

export function LocationPrompt() {
  const { geo, hydrated, requestLocation, setGeoCity, dismissLocationPrompt } = useApp();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [closing, setClosing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const dismissRef = useRef(dismissLocationPrompt);
  const closedRef = useRef(false);
  /** Failure copy only answers a tap made on this page; an old stored refusal alone never re-opens the banner. */
  const askedRef = useRef(false);

  dismissRef.current = dismissLocationPrompt;

  useEffect(() => {
    if (!hydrated) return;
    if (closedBefore()) {
      setBlocked(true);
      return;
    }
    let live = true;
    void permissionBlocked().then((no) => {
      if (live) setBlocked(no);
    });
    return () => {
      live = false;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || blocked === null) return;
    closedRef.current = false;
    if (geo.dismissed || closedBefore()) {
      setPhase(null);
      return;
    }
    if (geo.city && geo.status === "granted") {
      setPhase(geo.source === "manual" ? "manual" : "ok");
      return;
    }
    const failed = FAILED[geo.status];
    if (failed && askedRef.current) {
      setPhase(failed);
      return;
    }
    if (blocked) {
      setPhase(null);
      return;
    }
    setPhase((p) => (p === "pending" ? p : "ask"));
  }, [hydrated, blocked, geo]);

  const finish = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    rememberClosed();
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
    askedRef.current = true;
    setPicking(false);
    setPhase("pending");
    requestLocation();
  };

  const onPick = (city: string) => {
    if (!city) return;
    setPicking(false);
    setGeoCity(city);
  };

  if (!phase) return null;

  const done = phase === "ok" || phase === "manual";
  const copy = done ? t("loc.ok.body", { city: geo.city || "—" }) : t(COPY[phase]);
  const title = phase === "ok" ? t("loc.ok") : phase === "manual" ? t("loc.manual") : null;
  const canAsk = phase === "ask" || phase === "pending" || phase === "timeout" || phase === "error";
  const canPick = !done && phase !== "pending";
  const hasActions = canAsk || canPick;

  return (
    <div className={`loc-banner ${closing ? "loc-banner-out" : ""}`} role="status">
      <div className={`loc-banner-row ${hasActions ? "has-allow" : "is-result"}`}>
        <MapPin className="loc-banner-icon" />
        <div className="loc-banner-copy">
          {title ? <p className="loc-banner-title">{title}</p> : null}
          <p className="loc-banner-text">{copy}</p>
        </div>
        {hasActions ? (
          <div className="loc-banner-actions">
            {canAsk ? (
              <button type="button" className="btn-primary loc-banner-allow" onClick={onAllow} disabled={phase === "pending"}>
                {phase === "timeout" || phase === "error" ? t("loc.retry") : t("loc.allow")}
              </button>
            ) : null}
            {canPick ? (
              picking ? (
                <select
                  className="dash-input loc-banner-select"
                  aria-label={t("loc.pick")}
                  defaultValue=""
                  autoFocus
                  onChange={(e) => onPick(e.target.value)}
                >
                  <option value="" disabled>
                    {t("loc.pick")}
                  </option>
                  {regionNamesFor().map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <button type="button" className="btn-ghost loc-banner-allow" onClick={() => setPicking(true)}>
                  {t("loc.pick")}
                </button>
              )
            ) : null}
          </div>
        ) : null}
        <button type="button" className="loc-banner-x" onClick={closeNow} aria-label={t("common.close")}>
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
