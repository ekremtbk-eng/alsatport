"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Bitcoin,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CURRENCIES, FX_FROM_TRY, isMethodActive, type PayMethodId } from "@/i18n/config";
import { addons, packages } from "@/data/store";
import { TURKEY_CITIES } from "@/data/turkey";
import { CAYMA_YOK } from "@/data/legal";
import { DistanceSalesBody } from "@/components/DistanceSalesBody";
import { PreInfoBody } from "@/components/PreInfoBody";
import Link from "next/link";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import { postListingHref } from "@/lib/profile";
import { paymentsPaused } from "@/lib/campaign";

const ICONS: Record<PayMethodId, typeof CreditCard> = {
  iyzico: Landmark,
  paytr: Wallet,
  stripe: CreditCard,
  paypal: Wallet,
  crypto: Bitcoin,
};

function CheckoutInner() {
  const params = useSearchParams();
  const planId = (params.get("plan") ?? "vip") as string;
  const pkg =
    packages.find((p) => p.id === planId) ??
    addons.find((p) => p.id === planId) ??
    packages[2];
  const { t, formatMoney, currency, setCurrency, locale, inTurkeyHint, setInTurkeyHint } =
    useI18n();
  const { geo, startPaytrCheckout, pollPayment, user } = useApp();
  const [method, setMethod] = useState<PayMethodId | null>("paytr");
  const [done, setDone] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [paymentId, setPaymentId] = useState(params.get("payment") ?? "");

  const turkey =
    inTurkeyHint ||
    (geo.city ? TURKEY_CITIES.some((c) => c.name === geo.city) : locale === "tr");

  const amountTry = pkg.price;
  const itemKey =
    pkg.id === "vip"
      ? "pay.item.vip"
      : pkg.id === "profesyonel"
        ? "pay.item.pro"
        : pkg.id === "doping"
          ? "pay.item.doping"
          : "pay.item.std";

  const methods = useMemo(
    () => [{ id: "paytr" as PayMethodId, on: isMethodActive("paytr", currency, turkey) }],
    [currency, turkey],
  );

  const active = method && methods.find((m) => m.id === method)?.on ? method : methods.find((m) => m.on)?.id;
  const canSubmit =
    legalAccepted &&
    !!active &&
    amountTry > 0 &&
    pkg.id !== "standart" &&
    !busy &&
    !iframeUrl;

  useEffect(() => {
    if (!paymentId || done) return;
    let cancelled = false;
    const tick = async () => {
      const res = await pollPayment(paymentId);
      if (cancelled) return;
      if (res.status === "succeeded") {
        setDone(true);
        setIframeUrl("");
      }
      if (res.status === "failed" || res.status === "canceled") {
        setHint(t("pay.paytr.fail"));
        setIframeUrl("");
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paymentId, done, pollPayment, t]);

  async function beginPay() {
    if (!canSubmit) return;
    if (!user) {
      window.location.href = `/giris?next=${encodeURIComponent(`/odeme?plan=${pkg.id}`)}`;
      return;
    }
    setBusy(true);
    setHint("");
    const started = await startPaytrCheckout({
      product: pkg.id as "profesyonel" | "vip" | "doping",
      legalAccepted: true,
    });
    setBusy(false);
    if (!started.ok || !started.iframeUrl || !started.paymentId) {
      setHint(t(started.error ?? "pay.paytr.off"));
      return;
    }
    setPaymentId(started.paymentId);
    setIframeUrl(started.iframeUrl);
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("nav.checkout")}</p>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{t("pay.h")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("pay.sub")}</p>
          <p className="mt-2 max-w-xl text-xs text-soft">{t("pay.fxHint")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {paymentsPaused() && !done ? (
        <div className="rounded-3xl border border-lime/35 bg-lime/10 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-lime" />
          <p className="mt-3 text-lg font-extrabold">{t("pay.campaign")}</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{t("pkg.campaign.p")}</p>
          {user ? (
            <div className="mx-auto mt-4 max-w-md text-left">
              <EntitlementStatus />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={postListingHref(user)} className="btn-primary inline-flex h-11 px-5 text-sm">
              {t("post.h")}
            </Link>
            <Link href="/paketler" className="btn-ghost inline-flex h-11 px-5 text-sm">
              {t("footer.packages")}
            </Link>
          </div>
        </div>
      ) : null}

      {!(paymentsPaused() && !done) ? (
        <>
      <p className="mb-4 rounded-2xl border border-line bg-card px-4 py-2 text-xs text-soft">
        {turkey ? t("pay.loc.tr") : t("pay.loc.gl")}
        {" · "}
        <button
          type="button"
          className="ms-3 font-semibold text-lime"
          onClick={() => setInTurkeyHint(!turkey)}
        >
          {turkey ? "Global" : "TR"}
        </button>
      </p>

      {done ? (
        <div className="rounded-3xl border border-lime/35 bg-lime/10 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-lime" />
          <p className="mt-3 text-lg font-extrabold">{t("pay.success")}</p>
          {user ? (
            <div className="mx-auto mt-4 max-w-md text-left">
              <EntitlementStatus />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/paketler" className="btn-primary inline-flex h-11 px-5 text-sm">
              {t("pay.success.pack")}
            </Link>
            <Link href={postListingHref(user)} className="btn-ghost inline-flex h-11 px-5 text-sm">
              {t("post.h")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div>
              <h2 className="mb-2 text-sm font-bold">{t("pay.methods")}</h2>
              {methods.map((m) => {
                const Icon = ICONS[m.id];
                const selected = active === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.on}
                    onClick={() => m.on && setMethod(m.id)}
                    className={`mb-2 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      !m.on
                        ? "cursor-not-allowed border-line/50 bg-card/40 opacity-45"
                        : selected
                          ? "border-lime/50 bg-lime-deep"
                          : "border-line bg-card hover:border-lime/30"
                    }`}
                  >
                    <span className="icon-tile grid h-11 w-11 place-items-center rounded-xl text-lime">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-extrabold">{t(`pay.${m.id}`)}</span>
                        {m.on && selected && (
                          <span className="text-[10px] font-bold uppercase text-lime">●</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{t(`pay.${m.id}.d`)}</span>
                      {!m.on && (
                        <span className="mt-1 block text-[11px] text-orange">{t("pay.inactive")}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-line bg-card p-4">
              <h2 className="text-sm font-bold text-ink">{t("pay.legal.h")}</h2>
              <p className="mt-2 rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 text-xs font-semibold text-ink">
                {CAYMA_YOK}.
              </p>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-line bg-elev p-3">
                <DistanceSalesBody compact />
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-line bg-elev p-3">
                <PreInfoBody compact />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                <Link href="/mesafeli-satis" className="font-semibold text-lime hover:underline" target="_blank">
                  {t("pay.legal.distance")}
                </Link>
                {" · "}
                <Link href="/on-bilgilendirme" className="font-semibold text-lime hover:underline" target="_blank">
                  {t("pay.legal.pre")}
                </Link>
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-line"
                  checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                />
                <span>{t("pay.legal.check")}</span>
              </label>
            </div>
          </section>

          <aside className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-bold">{t("pay.summary")}</h2>
            <p className="mt-3 text-sm font-semibold">{t(itemKey)}</p>
            {!user ? (
              <p className="mt-2 rounded-xl border border-orange/30 bg-orange/10 px-3 py-2 text-xs text-ink">
                {t("auth.login.p")}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              {t("pay.trybase")}: {amountTry.toLocaleString("tr-TR")} ₺
            </p>
            {"listPrice" in pkg && pkg.listPrice > pkg.price ? (
              <p className="mt-1 text-xs text-muted">
                <span className="line-through">{pkg.listPrice.toLocaleString("tr-TR")} ₺</span>
                <span className="ms-2 font-bold text-lime">{t("pkg.badge50")}</span>
              </p>
            ) : null}
            <p className="price-text mt-3 text-3xl font-extrabold">{formatMoney(amountTry)}</p>
            <p className="mt-1 text-[11px] text-muted">
              {t("pay.fx")}: 1 TRY → {FX_FROM_TRY[currency].toFixed(4)} {currency}
            </p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                {t("currency.label")}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCurrency(c.id)}
                    className={`rounded-xl py-2 text-xs font-extrabold ${
                      c.id === currency ? "bg-lime/20 text-lime" : "bg-elev text-soft"
                    }`}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] text-muted">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />
              {t("pay.pci")}
            </p>
            {hint ? <p className="mt-2 text-xs font-semibold text-orange">{hint}</p> : null}
            <button
              type="button"
              className="btn-primary mt-5 h-12 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSubmit}
              onClick={() => void beginPay()}
            >
              {t("pay.complete")}
              {user ? ` · ${user.displayName}` : ""}
            </button>
            {!legalAccepted ? (
              <p className="mt-2 text-center text-[11px] text-orange">{t("pay.legal.need")}</p>
            ) : null}
          </aside>
        </div>
      )}
        </>
      ) : null}

      {iframeUrl && !paymentsPaused() ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4">
          <div className="flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
            <p className="px-4 py-3 text-center text-sm font-bold">{t("pay.iframe")}</p>
            <iframe title="PayTR" src={iframeUrl} className="min-h-0 w-full flex-1 bg-white" />
            <button
              type="button"
              className="h-11 text-sm text-muted"
              onClick={() => setIframeUrl("")}
            >
              {t("pay.3ds.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
