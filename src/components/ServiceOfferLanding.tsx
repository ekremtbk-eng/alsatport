"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TURKEY_CITIES } from "@/data/turkey";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isValidEmail } from "@/lib/auth";
import { postListingHref } from "@/lib/profile";
import {
  SERVICE_OFFER_PATH,
  serviceListingStartHref,
  serviceOfferSignupHref,
} from "@/lib/serviceOffer";

import { ServicesLogo } from "@/components/ServicesLogo";

const USTA_IMG = "/images/ustalar-usta.jpg";

export function ServiceOfferLanding() {
  const { t } = useI18n();
  const { user } = useApp();
  const router = useRouter();
  const cities = useMemo(() => TURKEY_CITIES.map((c) => c.name), []);
  const defaultCity =
    user?.city && cities.includes(user.city) ? user.city : "İstanbul";
  const [city, setCity] = useState(defaultCity);
  const [email, setEmail] = useState(user?.email ?? "");
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (user?.email) setEmail((prev) => prev || user.email || "");
    if (user?.city && cities.includes(user.city)) {
      setCity((current) => (current === "İstanbul" ? user.city : current));
    }
  }, [user, cities]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setHint("");
    if (!city || !cities.includes(city)) {
      setHint(t("svc.offerNeedCity"));
      return;
    }
    if (!isValidEmail(email)) {
      setHint(t("svc.offerNeedEmail"));
      return;
    }
    const listing = serviceListingStartHref(city);
    if (user) {
      router.push(postListingHref(user, listing));
      return;
    }
    router.push(serviceOfferSignupHref(email, city));
  }

  return (
    <div className="svc-offer">
      <header className="svc-offer-bar">
        <div className="svc-offer-bar-inner">
          <Link href="/kategoriler/ustalar-hizmetler" className="svc-portal-brand" aria-label={t("cat.services")}>
            <ServicesLogo />
          </Link>
          <div className="svc-portal-actions">
            {user ? null : (
              <Link href={`/giris?next=${encodeURIComponent(SERVICE_OFFER_PATH)}`} className="svc-portal-login">
                {t("nav.login")}
              </Link>
            )}
            <a href="#basvuru" className="svc-offer-top-cta">
              {t("svc.offer")}
            </a>
          </div>
        </div>
      </header>

      <main className="svc-offer-main">
        <div className="svc-offer-panel">
          <h1>{t("svc.offerTitle")}</h1>
          <p className="svc-offer-lead">{t("svc.offerLead")}</p>

          <div className="svc-offer-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={USTA_IMG} alt="" className="svc-offer-photo" />
            <form id="basvuru" className="svc-offer-form" onSubmit={onSubmit} noValidate>
              <label htmlFor="svc-offer-city">{t("svc.offerCity")}</label>
              <select
                id="svc-offer-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              >
                {cities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <label htmlFor="svc-offer-email">{t("svc.offerEmail")}</label>
              <input
                id="svc-offer-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {hint ? <p className="svc-offer-hint">{hint}</p> : null}

              <button type="submit" className="svc-offer-submit">
                {t("svc.offer")}
              </button>
            </form>
          </div>
        </div>
      </main>

      <p className="svc-offer-legal">
        {t("svc.offerLegalBefore")}
        <Link href="/gizlilik-politikasi">{t("svc.offerLegalHere")}</Link>
        {t("svc.offerLegalAfter")}
      </p>
    </div>
  );
}
