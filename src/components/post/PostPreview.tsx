"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { FeatureGrid } from "@/components/FeatureGrid";
import { useI18n } from "@/context/I18nContext";

type EditTarget = "fotograflar" | "bilgiler" | "detaylar" | "fiyat" | "aciklama";

/** Pre-publish view laid out like the listing detail page; every block links back to the step that fills it. */
export function PostPreview({
  images,
  title,
  priceLabel,
  description,
  place,
  categoryLabel,
  specs,
  featureGroups,
  features,
  canEdit,
  onEdit,
}: {
  images: string[];
  title: string;
  priceLabel: string;
  description: string;
  place: string;
  categoryLabel: string;
  specs: { label: string; value: string }[];
  featureGroups: { id: string; title: string; items: string[] }[];
  features: string[];
  canEdit: (step: EditTarget) => boolean;
  onEdit: (step: EditTarget) => void;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(0);
  const [featsOpen, setFeatsOpen] = useState(false);
  const selectedGroups = featureGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => features.includes(item)) }))
    .filter((g) => g.items.length);
  const key = specs.slice(0, 3);

  const edit = (step: EditTarget) =>
    canEdit(step) ? (
      <button type="button" className="pv-edit" onClick={() => onEdit(step)} data-edit-step={step}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {t("post.editStep")}
      </button>
    ) : null;

  return (
    <article className="pv" aria-label={t("post.preview")}>
      <div className="pv-gallery">
        <div
          className="pv-track"
          onScroll={(e) => {
            const el = e.currentTarget;
            setShown(Math.abs(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
          }}
        >
          {images.map((src, i) => (
            <div key={src} className="pv-slide">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("photo.alt", { n: i + 1 })} />
            </div>
          ))}
        </div>
        {images.length > 0 ? (
          <span className="pv-counter">
            {Math.min(images.length, shown + 1)}/{images.length}
          </span>
        ) : null}
        {images.length > 0 ? <span className="pv-cover-badge">{t("photo.cover")}</span> : null}
        <div className="pv-gallery-edit">{edit("fotograflar")}</div>
      </div>

      <section className="pv-card">
        <div className="pv-row">
          <p className="pv-cat">{categoryLabel}</p>
          {edit("aciklama")}
        </div>
        <h2 className="pv-title">{title}</h2>
        <div className="pv-row">
          <p className="pv-price">{priceLabel}</p>
          {edit("fiyat")}
        </div>
        <p className="pv-place">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {place}
        </p>
        {key.length ? (
          <ul className="pv-keys">
            {key.map((s) => (
              <li key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="pv-card">
        <div className="pv-row">
          <h3 className="pv-h">{t("post.body")}</h3>
          {edit("aciklama")}
        </div>
        <p className="pv-body">{description || t("post.nodesc")}</p>
      </section>

      {specs.length ? (
        <section className="pv-card">
          <div className="pv-row">
            <h3 className="pv-h">{t("post.infoH")}</h3>
            {edit("bilgiler")}
          </div>
          <dl className="pv-specs">
            {specs.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {features.length ? (
        <section className="pv-card">
          <div className="pv-row">
            <h3 className="pv-h">{t("post.featN", { n: features.length })}</h3>
            {edit("detaylar")}
          </div>
          <button type="button" className="pv-link" onClick={() => setFeatsOpen((v) => !v)} aria-expanded={featsOpen}>
            {featsOpen ? t("post.hideFeatures") : t("post.seeFeatures")}
          </button>
          {featsOpen ? <FeatureGrid groups={selectedGroups} selected={features} readOnly /> : null}
        </section>
      ) : null}
    </article>
  );
}
