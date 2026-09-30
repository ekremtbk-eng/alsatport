"use client";

import { Check, Crown, Gem, Rocket, Star } from "lucide-react";
import { addons, packages } from "@/data/store";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import Link from "next/link";
import { hasOpenAccess, paymentsPaused } from "@/lib/campaign";
import { hasActiveDoping } from "@/lib/listingQuota";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import { reconcileEntitlements } from "@/lib/entitlements";

export default function PackagesPage() {
  const { user } = useApp();
  const { t, formatMoney } = useI18n();
  const live = user ? reconcileEntitlements(user) : null;
  const campaign = paymentsPaused() || hasOpenAccess(live);

  const cards = [
    ...packages.map((p) => ({
      ...p,
      kind: "plan" as const,
      title: p.altName ?? p.name,
      Icon: p.id === "vip" ? Gem : p.id === "profesyonel" ? Star : Crown,
    })),
    {
      ...addons[0],
      kind: "addon" as const,
      title: addons[0].name,
      altName: addons[0].name,
      Icon: Rocket,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-3 py-6">
      <p className="text-xs font-extrabold uppercase tracking-wider text-lime">{campaign ? t("pkg.campaign.badge") : t("pkg.badge50")}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink">{t("pkg.h")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{campaign ? t("pkg.campaign.p") : t("pkg.p50")}</p>
      {user ? (
        <div className="mt-3">
          <EntitlementStatus />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map((p) => {
          const dopingOn = hasActiveDoping(live?.dopingUntil);
          const current = (p.kind === "plan" && live?.plan === p.id) || (p.id === "doping" && dopingOn);
          const Icon = p.Icon;
          const accent =
            p.id === "vip" ? "text-orange" : p.id === "profesyonel" ? "text-blue" : p.id === "doping" ? "text-lime" : "text-ink";
          const featKeys =
            p.id === "standart"
              ? ["pkg.std.f1", "pkg.std.f2", "pkg.std.f3"]
              : p.id === "profesyonel"
                ? ["pkg.pro.f1", "pkg.pro.f2", "pkg.pro.f3"]
                : p.id === "vip"
                  ? ["pkg.vip.f1", "pkg.vip.f2", "pkg.vip.f3", "pkg.vip.f4"]
                  : ["pkg.dop.f1", "pkg.dop.f2", "pkg.dop.f3"];
          const periodKey =
            p.id === "standart"
              ? "pkg.period.std"
              : p.id === "profesyonel"
                ? "pkg.period.15"
                : p.id === "doping"
                  ? "pkg.period.3"
                  : "pkg.period.30";
          return (
            <article
              key={p.id}
              className={`rounded-xl border p-5 shadow-sm ${
                p.id === "vip"
                  ? "border-orange/50 bg-gradient-to-br from-orange/10 to-card"
                  : p.id === "profesyonel"
                    ? "border-blue/40 bg-gradient-to-br from-blue/10 to-card"
                    : "border-line bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${accent}`} />
                  <h2 className="text-lg font-bold text-ink">{p.title}</h2>
                </div>
                {p.discount && !campaign ? (
                  <span className="rounded-xl bg-lime/15 px-2 py-0.5 text-[11px] font-extrabold text-lime">
                    %{p.discount}
                  </span>
                ) : null}
              </div>
              <p className="mt-3">
                {campaign ? (
                  <span className="text-2xl font-extrabold text-ink">{t("pkg.free")}</span>
                ) : (
                  <>
                {p.listPrice > p.price ? (
                  <span className="me-2 text-sm text-muted line-through">{formatMoney(p.listPrice)}</span>
                ) : null}
                <span className="text-2xl font-extrabold text-ink">
                  {p.price === 0 ? t("pkg.free") : formatMoney(p.price)}
                </span>
                  </>
                )}
                <span className="ms-2 text-xs text-muted">{campaign ? t("pkg.campaign.badge") : t(periodKey)}</span>
              </p>
              {!campaign && p.listPrice > p.price ? (
                <p className="mt-1 text-[11px] font-semibold text-lime">{t("pkg.vsMarket")}</p>
              ) : null}
              <ul className="mt-3 space-y-1.5">
                {featKeys.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-ink">
                    <Check className={`h-4 w-4 ${accent}`} /> {t(key)}
                  </li>
                ))}
              </ul>
              {live && (current || campaign) ? (
                <button type="button" className="btn-ghost mt-4 h-11 w-full rounded-xl text-sm">
                  {campaign ? t("pkg.campaign.included") : t("pkg.current")}
                </button>
              ) : !live ? (
                  <Link href="/kayit?next=/paketler" className="btn-primary mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm">
                    {t("pkg.std.signup")}
                  </Link>
              ) : p.price === 0 ? (
                  <button type="button" disabled className="btn-ghost mt-4 h-11 w-full rounded-xl text-sm opacity-70">
                    {t("pkg.std.auto")}
                  </button>
              ) : (
                <Link
                  href={
                    user
                      ? `/odeme?plan=${p.id}`
                      : `/giris?next=${encodeURIComponent(`/odeme?plan=${p.id}`)}`
                  }
                  className={`mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold ${
                    p.id === "vip" ? "btn-orange" : p.id === "doping" ? "btn-primary" : "btn-blue"
                  }`}
                >
                  {t("pkg.buy")}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
