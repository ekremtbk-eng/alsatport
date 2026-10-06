"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import type { Listing } from "@/data/store";
import { chassisSummary, emptyChassis, schemaForCategoryId } from "@/data/listingSchema";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";
import { listingSpecSections } from "@/components/ListingSpecTables";
import { listingDescriptionText } from "@/components/listing/ListingDescriptionPanel";
import { classifiedFactRows, classifiedFeatureItems, listingCategoryChain } from "@/lib/listingFacts";
import { listingPublicUrl } from "@/lib/shareListing";
import { listingSellerLabel } from "@/lib/publicName";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { localeMeta } from "@/i18n/config";

type Row = { label: string; value: string };
type Variant = "hero" | "toolbar" | "icon" | "inline";

const BODY_CLASS = "print-listing";

async function waitForPrintPhoto() {
  const img = document.querySelector<HTMLImageElement>(".print-sheet .ps-photo img");
  if (!img || img.complete) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    window.setTimeout(done, 2500);
  });
}

export function ListingPrintButton({ variant }: { variant: Variant }) {
  const { t } = useI18n();
  const label = t("print.btn");

  async function print() {
    await waitForPrintPhoto();
    window.print();
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={() => void print()}
        aria-label={label}
        title={label}
        className="grid h-9 w-9 place-items-center rounded-full bg-black/50"
      >
        <Printer className="h-5 w-5 text-white" />
      </button>
    );
  }
  if (variant === "toolbar") {
    return (
      <button type="button" className="classified-icon-btn" onClick={() => void print()} aria-label={label} title={label}>
        <Printer className="h-4 w-4" />
      </button>
    );
  }
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => void print()}
        aria-label={label}
        title={label}
        className="hidden h-12 w-12 place-items-center rounded-xl border border-line md:grid"
      >
        <Printer className="h-5 w-5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => void print()} className="inline-flex items-center gap-1 font-semibold text-ink">
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RowGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="ps-grid">
      {rows.map((r) => (
        <div key={r.label} className="ps-row">
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ps-sec">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** Print-only A4 sheet, portaled to <body>; respects the same guest gating as the on-screen tabs. */
export function ListingPrintSheet({
  listing,
  mode,
  formatMoney,
}: {
  listing: Listing;
  mode: "standard" | "classified";
  formatMoney: (n: number) => string;
}) {
  const { user, hydrated } = useApp();
  const { t, locale, dir } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, []);

  if (!mounted) return null;

  const locked = mode === "standard" && (!hydrated || !user);
  const schema = schemaForCategoryId(listing.categoryId);
  const sections = listingSpecSections(listing, schema);
  const chain = listingCategoryChain(listing.categoryId)
    .map((c) => catName(t, c.id, c.name))
    .join(" › ");
  const place = [listing.city, listing.district, mode === "classified" || !locked ? listing.neighborhood : undefined]
    .filter(Boolean)
    .join(" / ");
  const url = listingPublicUrl(listing.id);
  const printedAt = new Date().toLocaleDateString(localeMeta(locale).htmlLang, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const description = listingDescriptionText(listing.description);
  const features =
    mode === "classified"
      ? classifiedFeatureItems(listing)
      : (listing.features ?? []).filter((f) => schema.groups.some((g) => g.items.includes(f)));
  const chassis =
    schema.chassis && listing.chassis
      ? (() => {
          const s = chassisSummary(listing.chassis ?? emptyChassis());
          return `${s.painted} boyalı · ${s.changed} değişen · ${s.local} lokal boya`;
        })()
      : "";

  const keyRows: Row[] = [
    { label: t("list.no"), value: listing.listingNo || listing.id },
    { label: t("list.posted"), value: listing.createdAt },
    ...(chain ? [{ label: t("list.fact.cat"), value: chain }] : []),
    ...(place ? [{ label: t("print.location"), value: place }] : []),
  ];
  const extraRows = mode === "classified" ? classifiedFactRows(listing, t) : locked ? [] : sections.hi;
  const seen = new Set<string>();
  const summaryRows = [...keyRows, ...extraRows].filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)));
  const inSummary = new Set(summaryRows.map((r) => r.label));
  const familyRows = sections.family.rows.filter((r) => !inSummary.has(r.label));
  const restRows = sections.rest.filter((r) => !inSummary.has(r.label));

  return createPortal(
    <div className="print-sheet" aria-hidden dir={dir} lang={localeMeta(locale).htmlLang}>
      <header className="ps-head">
        <div className="ps-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_SRC} alt="" className="ps-logo" />
          <div>
            <p className="ps-brand-name">{BRAND_NAME}</p>
            <p className="ps-brand-site">alsatport.com</p>
          </div>
        </div>
        <div className="ps-head-meta">
          <p>
            {t("list.no")}: <strong>{listing.listingNo || listing.id}</strong>
          </p>
          <p>
            {t("print.printedAt")}: {printedAt}
          </p>
        </div>
      </header>

      <h1 className="ps-title">{listing.title}</h1>
      {listing.subtitle ? <p className="ps-subtitle">{listing.subtitle}</p> : null}

      <div className="ps-top">
        {listing.images[0] ? (
          <div className="ps-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.images[0]} alt="" loading="eager" decoding="sync" />
          </div>
        ) : null}
        <div className="ps-summary">
          <p className="ps-price-label">{t("print.price")}</p>
          <p className="ps-price">{formatMoney(listing.price)}</p>
          <RowGrid rows={summaryRows} />
        </div>
      </div>

      {locked ? (
        <p className="ps-locked">{t("print.locked")}</p>
      ) : (
        <>
          {mode === "standard" && familyRows.length ? (
            <Section title={sections.family.title}>
              <RowGrid rows={familyRows} />
            </Section>
          ) : null}
          {mode === "standard" && restRows.length ? (
            <Section title={t("loc.tab.details")}>
              <RowGrid rows={restRows} />
            </Section>
          ) : null}
          {chassis ? (
            <Section title={t("print.chassis")}>
              <p className="ps-text">{chassis}</p>
            </Section>
          ) : null}
          {features.length ? (
            <Section title={t("list.feat")}>
              <ul className="ps-feats">
                {features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
            </Section>
          ) : null}
          {description ? (
            <section className="ps-sec">
              <h2>{t("loc.tab.description")}</h2>
              <p className="ps-text">{description}</p>
            </section>
          ) : null}
        </>
      )}

      <Section title={t("print.seller")}>
        <div className="ps-seller">
          <p className="ps-seller-name">{listingSellerLabel(listing)}</p>
          <p>
            {listing.sellerBusiness ? t("print.business") : t("print.individual")}
            {listing.sellerVerified ? ` · ${t("print.verified")}` : ""}
          </p>
          {listing.sellerSince ? (
            <p>
              {t("seller.since")}: {listing.sellerSince}
            </p>
          ) : null}
        </div>
      </Section>

      <footer className="ps-foot">
        <p className="ps-url">{url}</p>
        <p>{t("print.footer")}</p>
      </footer>
    </div>,
    document.body,
  );
}
