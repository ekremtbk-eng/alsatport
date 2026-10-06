"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { QrSvg } from "@/components/QrSvg";
import {
  ArrowUpDown,
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  FileImage,
  Flame,
  Layers,
  Map as MapIcon,
  MapPin,
  Phone,
  Printer,
  Ruler,
  Sofa,
  SquareParking,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Listing } from "@/data/store";
import { useI18n } from "@/context/I18nContext";
import { listingPublicUrl } from "@/lib/shareListing";
import { listingSellerLabel } from "@/lib/publicName";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import {
  POSTER_SIZES,
  defaultPosterTemplate,
  posterDeal,
  posterFeatures,
  posterPageCss,
  posterPhone,
  posterPrice,
  posterTemplateAllowed,
  type PosterSize,
  type PosterTemplate,
} from "@/lib/poster";

const BODY_CLASS = "print-poster";
const LISTING_PRINT_CLASS = "print-listing";
const MM_TO_PX = 96 / 25.4;
const TEMPLATES: PosterTemplate[] = ["sale", "rent", "plain"];
const SIZES: PosterSize[] = ["a4p", "a4l", "a3p", "a3l"];

/** Poster copy is printed for the Turkish street, so it stays Turkish regardless of UI locale. */
const DEAL_WORD = { sale: "SATILIK", rent: "KİRALIK" } as const;
const SCAN_TEXT = "İlanın fotoğraflarını ve tüm detaylarını görmek için okutun";
const SLOGAN = "Al, Sat, Keşfet!";

const FEATURE_ICONS: Record<string, LucideIcon> = {
  Oda: BedDouble,
  "m²": Ruler,
  "Net m²": Ruler,
  Kat: Layers,
  Isıtma: Flame,
  Balkon: Sun,
  Asansör: ArrowUpDown,
  Otopark: SquareParking,
  Eşyalı: Sofa,
  "Site içerisinde": Building2,
  "İmar durumu": MapIcon,
  Banyo: Bath,
  "Bina yaşı": CalendarDays,
};

function PosterQr({ url }: { url: string }) {
  return <QrSvg value={url} className="pp-qr" />;
}

export function ListingPoster({
  listing,
  template,
  size,
  phone,
}: {
  listing: Listing;
  template: PosterTemplate;
  size: PosterSize;
  phone: string;
}) {
  const dims = POSTER_SIZES[size];
  const { period } = posterDeal(listing);
  const features = posterFeatures(listing);
  const url = listingPublicUrl(listing.id);
  const place = [listing.city, listing.district].filter(Boolean).join(" / ");
  const style = {
    "--pw": `${dims.w}mm`,
    "--ph": `${dims.h}mm`,
    "--u": `${Math.min(dims.w, dims.h) / 210}mm`,
  } as CSSProperties;

  const deal = template === "plain" ? null : <p className="pp-deal">{DEAL_WORD[template]}</p>;
  const photo = listing.images[0] ? (
    <div className="pp-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={listing.images[0]} alt="" loading="eager" decoding="sync" />
    </div>
  ) : null;
  const info = (
    <div className="pp-info">
      <h1 className="pp-title">{listing.title}</h1>
      {place ? (
        <p className="pp-place">
          <MapPin />
          {place}
        </p>
      ) : null}
      <p className="pp-price">{posterPrice(listing.price, period)}</p>
      {features.length ? (
        <ul className="pp-feats">
          {features.map((f) => {
            const Icon = FEATURE_ICONS[f.label] ?? Check;
            return (
              <li key={f.label}>
                <Icon />
                {f.text}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
  const foot = (
    <div className="pp-foot">
      <PosterQr url={url} />
      <div className="pp-cta">
        <p className="pp-scan">{SCAN_TEXT}</p>
        <p className="pp-url">{url.replace(/^https?:\/\//, "")}</p>
        <p className="pp-seller">
          {listing.sellerBusiness ? <BadgeCheck /> : <UserRound />}
          {listingSellerLabel(listing)}
        </p>
        {phone ? (
          <p className="pp-phone">
            <Phone />
            İletişim: {posterPhone(phone)}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={`pp pp-${template} ${dims.landscape ? "pp-landscape" : "pp-portrait"}`}
      style={style}
      lang="tr"
      dir="ltr"
      data-poster-size={size}
      data-poster-template={template}
    >
      <header className="pp-head">
        <div className="pp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_SRC} alt="" className="pp-logo" />
          <div>
            <p className="pp-brand-name">{BRAND_NAME}</p>
            <p className="pp-slogan">{SLOGAN}</p>
          </div>
        </div>
        <p className="pp-site">alsatport.com</p>
      </header>
      {dims.landscape ? (
        <div className="pp-main">
          {photo}
          <div className="pp-side">
            {deal}
            {info}
            {foot}
          </div>
        </div>
      ) : (
        <>
          {deal}
          {photo}
          {info}
          {foot}
        </>
      )}
    </div>
  );
}

async function waitForPosterImages(root: HTMLElement) {
  const pending = [...root.querySelectorAll("img")].filter((img) => !img.complete);
  await Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(resolve, 3000);
        }),
    ),
  );
}

export function ListingPosterButton({ variant, onClick }: { variant: "hero" | "block"; onClick: () => void }) {
  const { t } = useI18n();
  const label = t("poster.btn");
  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="grid h-9 w-9 place-items-center rounded-full bg-black/50"
      >
        <FileImage className="h-5 w-5 text-white" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-lime/40 bg-lime/5 text-sm font-bold text-lime"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}

/** Template/size picker with a scaled live preview; prints the poster alone on an exact-size page. */
export function ListingPosterDialog({
  listing,
  phone,
  open,
  onOpenChange,
}: {
  listing: Listing;
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { deal } = posterDeal(listing);
  const [template, setTemplate] = useState<PosterTemplate>(() => defaultPosterTemplate(deal));
  const [size, setSize] = useState<PosterSize>("a4p");
  const [printing, setPrinting] = useState(false);
  const [scale, setScale] = useState(0.3);
  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const dims = POSTER_SIZES[size];

  useEffect(() => {
    setTemplate(defaultPosterTemplate(deal));
  }, [deal, listing.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("afis") === "1") onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    const box = previewRef.current;
    if (!open || !box) return;
    const fit = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!w || !h) return;
      setScale(Math.min(w / (dims.w * MM_TO_PX), h / (dims.h * MM_TO_PX)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [open, dims.w, dims.h]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const style = document.createElement("style");
    style.dataset.posterPage = size;
    style.textContent = `@media print { ${posterPageCss(size)} }`;
    const hadListingClass = document.body.classList.contains(LISTING_PRINT_CLASS);
    const cleanup = () => {
      style.remove();
      document.body.classList.remove(BODY_CLASS);
      if (hadListingClass) document.body.classList.add(LISTING_PRINT_CLASS);
      window.removeEventListener("afterprint", cleanup);
      setPrinting(false);
    };
    void (async () => {
      if (printRef.current) await waitForPosterImages(printRef.current);
      if (cancelled) return;
      document.head.appendChild(style);
      document.body.classList.remove(LISTING_PRINT_CLASS);
      document.body.classList.add(BODY_CLASS);
      window.addEventListener("afterprint", cleanup);
      window.print();
    })();
    return () => {
      cancelled = true;
      if (document.body.classList.contains(BODY_CLASS)) cleanup();
    };
  }, [printing, size]);

  if (!open && !printing) return null;

  const templateLabel = (tpl: PosterTemplate) =>
    tpl === "sale" ? t("poster.tpl.sale") : tpl === "rent" ? t("poster.tpl.rent") : t("poster.tpl.plain");

  return createPortal(
    <>
      {open ? (
        <div className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/55 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={t("poster.title")}>
          <div className="flex h-full w-full flex-col overflow-hidden bg-panel text-ink md:h-auto md:max-h-[92vh] md:max-w-5xl md:rounded-2xl md:shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <FileImage className="h-5 w-5 text-lime" />
                {t("poster.title")}
              </h2>
              <button type="button" onClick={() => onOpenChange(false)} aria-label={t("poster.cancel")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-elev">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
              <div className="flex-none space-y-4 p-4 md:w-80 md:overflow-y-auto md:border-e md:border-line">
                <section>
                  <h3 className="mb-2 text-sm font-bold">1. {t("poster.step.template")}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((tpl) => {
                      const allowed = posterTemplateAllowed(tpl, deal);
                      const active = template === tpl;
                      return (
                        <button
                          key={tpl}
                          type="button"
                          disabled={!allowed}
                          onClick={() => setTemplate(tpl)}
                          title={allowed ? undefined : t("poster.tpl.mismatch")}
                          aria-pressed={active}
                          className={`relative rounded-xl border px-2 py-2.5 text-center text-xs font-extrabold transition ${
                            active ? "border-lime bg-lime/10 text-lime" : "border-line"
                          } ${allowed ? "" : "cursor-not-allowed opacity-40"}`}
                        >
                          {templateLabel(tpl)}
                          {tpl === defaultPosterTemplate(deal) ? (
                            <span className="mt-0.5 block text-[10px] font-semibold text-muted">{t("poster.recommended")}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-bold">2. {t("poster.step.size")}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZES.map((s) => {
                      const d = POSTER_SIZES[s];
                      const active = size === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          aria-pressed={active}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-start transition ${
                            active ? "border-lime bg-lime/10" : "border-line"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`flex-none rounded-[3px] border-2 ${active ? "border-lime" : "border-muted"}`}
                            style={{ width: d.landscape ? 22 : 16, height: d.landscape ? 16 : 22 }}
                          />
                          <span>
                            <span className="block text-xs font-extrabold">
                              {d.paper} {d.landscape ? t("poster.landscape") : t("poster.portrait")}
                            </span>
                            <span className="block text-[10px] text-muted">
                              {d.w} × {d.h} mm
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <p className="text-[11px] leading-snug text-muted">{t("poster.pdfHint")}</p>
                {!phone ? <p className="text-[11px] leading-snug text-muted">{t("poster.noPhone")}</p> : null}
              </div>

              <div className="flex min-h-[60vh] flex-1 flex-col bg-elev p-3 md:min-h-0">
                <p className="mb-2 text-center text-xs font-bold text-muted">{t("poster.preview")}</p>
                <div ref={previewRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden md:h-[62vh]">
                  <div
                    style={{
                      width: dims.w * MM_TO_PX * scale,
                      height: dims.h * MM_TO_PX * scale,
                    }}
                    className="relative flex-none overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-black/10"
                  >
                    <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                      <ListingPoster listing={listing} template={template} size={size} phone={phone} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-none gap-2 border-t border-line p-3 md:justify-end">
              <button type="button" onClick={() => onOpenChange(false)} className="btn-ghost h-12 flex-1 md:flex-none md:px-6">
                {t("poster.cancel")}
              </button>
              <button type="button" onClick={() => setPrinting(true)} disabled={printing} className="btn-primary h-12 flex-[2] md:flex-none md:px-6">
                <Printer className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{t("poster.print")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {printing ? (
        <div ref={printRef} className="poster-print" aria-hidden>
          <ListingPoster listing={listing} template={template} size={size} phone={phone} />
        </div>
      ) : null}
    </>,
    document.body,
  );
}
