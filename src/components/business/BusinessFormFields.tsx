"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { catName, useI18n } from "@/context/I18nContext";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { BUSINESS_DESC_MAX, businessCategories } from "@/lib/business/shared";
import { apiUpload } from "@/lib/security/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";
const MAX_MB = { logo: 2, cover: 6 } as const;

export type ProfileValues = {
  categoryId: string;
  city: string;
  district: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  coverUrl: string;
};

export function ImagePicker({
  kind,
  value,
  onChange,
}: {
  kind: "logo" | "cover";
  value: string;
  onChange: (url: string) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    const okType = /image\/(jpeg|jpg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!okType) return setError(t("photo.only"));
    if (file.size > MAX_MB[kind] * 1024 * 1024) return setError(t(kind === "logo" ? "biz.err.logoSize" : "biz.err.coverSize"));
    setBusy(true);
    const res = await apiUpload<{ ok?: boolean; url?: string; error?: string }>("/api/account/business/media", file, { kind });
    setBusy(false);
    if (!res.ok || !res.url) return setError(t(res.error ?? "auth.err.server"));
    onChange(res.url);
  }

  return (
    <div className={`biz-pick is-${kind}`}>
      <button type="button" className="biz-pick-box" disabled={busy} onClick={() => ref.current?.click()}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span className="biz-pick-empty">
            <ImagePlus aria-hidden="true" />
            {busy ? t("common.loading") : t(kind === "logo" ? "biz.f.logo" : "biz.f.cover")}
          </span>
        )}
      </button>
      <p className="biz-hint">{t(kind === "logo" ? "biz.f.logoHint" : "biz.f.coverHint")}</p>
      {value ? (
        <button type="button" className="biz-link" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? t("common.loading") : t("biz.f.change")}
        </button>
      ) : null}
      {error ? <p className="biz-err">{error}</p> : null}
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`biz-field${wide ? " is-wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Fields an approved store may keep editing (and that every application also fills in). */
export function ProfileFields({ v, set }: { v: ProfileValues; set: (patch: Partial<ProfileValues>) => void }) {
  const { t } = useI18n();
  return (
    <>
      <Field label={t("biz.f.category")}>
        <select className="dash-input" required value={v.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
          <option value="">{t("biz.f.choose")}</option>
          {businessCategories().map((c) => (
            <option key={c.id} value={c.id}>
              {catName(t, c.id, c.name)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("biz.f.city")}>
        <select className="dash-input" required value={v.city} onChange={(e) => set({ city: e.target.value, district: "" })}>
          <option value="">{t("biz.f.choose")}</option>
          {TURKEY_CITIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("biz.f.district")}>
        <select className="dash-input" value={v.district} disabled={!v.city} onChange={(e) => set({ district: e.target.value })}>
          <option value="">{t("biz.f.choose")}</option>
          {(v.city ? districtsOf(v.city) : []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("biz.f.phone")}>
        <input
          className="dash-input"
          required
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          value={v.phone}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder="0 (212) 000 00 00"
        />
      </Field>
      <Field label={t("biz.f.email")}>
        <input
          className="dash-input"
          required
          type="email"
          autoComplete="email"
          maxLength={254}
          value={v.email}
          onChange={(e) => set({ email: e.target.value })}
        />
      </Field>
      <Field label={t("biz.f.website")}>
        <input
          className="dash-input"
          type="url"
          inputMode="url"
          maxLength={200}
          value={v.website}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="https://"
        />
      </Field>
      <Field label={t("biz.f.description")} wide>
        <textarea
          className="dash-input biz-textarea"
          required
          minLength={20}
          maxLength={BUSINESS_DESC_MAX}
          rows={5}
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <small className="biz-hint">
          {v.description.trim().length}/{BUSINESS_DESC_MAX}
        </small>
      </Field>
      <div className="biz-field is-wide biz-pick-row">
        <div>
          <span className="biz-field-label">{t("biz.f.logo")}</span>
          <ImagePicker kind="logo" value={v.logoUrl} onChange={(url) => set({ logoUrl: url })} />
        </div>
        <div>
          <span className="biz-field-label">{t("biz.f.cover")}</span>
          <ImagePicker kind="cover" value={v.coverUrl} onChange={(url) => set({ coverUrl: url })} />
        </div>
      </div>
    </>
  );
}
