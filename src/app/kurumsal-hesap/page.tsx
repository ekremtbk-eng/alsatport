"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BusinessStatusCard } from "@/components/business/BusinessStatusCard";
import { Field, ProfileFields, type ProfileValues } from "@/components/business/BusinessFormFields";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { COMPANY_TYPES, type CompanyType, type OwnerBusiness } from "@/lib/business/shared";
import { apiPost } from "@/lib/security/client";

type FormValues = ProfileValues & {
  name: string;
  contactName: string;
  companyType: CompanyType;
  taxOffice: string;
  taxNumber: string;
};

const EMPTY: FormValues = {
  name: "",
  contactName: "",
  companyType: "sahis",
  taxOffice: "",
  taxNumber: "",
  categoryId: "",
  city: "",
  district: "",
  description: "",
  website: "",
  email: "",
  phone: "",
  logoUrl: "",
  coverUrl: "",
};

function fromBusiness(b: OwnerBusiness): FormValues {
  return {
    name: b.name,
    contactName: b.contactName,
    companyType: b.companyType,
    taxOffice: b.taxOffice,
    taxNumber: b.taxNumber,
    categoryId: b.categoryId,
    city: b.city,
    district: b.district,
    description: b.description,
    website: b.website,
    email: b.email,
    phone: b.phone,
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
  };
}

export default function BusinessApplyPage() {
  const { user } = useApp();
  const { t } = useI18n();
  const { business, setBusiness } = useOwnBusiness();
  const [v, setV] = useState<FormValues>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (business) setV(fromBusiness(business));
    else if (business === null && user) {
      setV((cur) => ({ ...cur, contactName: cur.contactName || user.fullName || "", email: cur.email || user.email || "" }));
    }
  }, [business, user]);

  const set = (patch: Partial<FormValues>) => setV((cur) => ({ ...cur, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!v.logoUrl || !v.coverUrl) return setError(t("biz.err.imagesRequired"));
    if (v.description.trim().length < 20) return setError(t("biz.err.description"));
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string; business?: OwnerBusiness }>("/api/account/business", v);
    setBusy(false);
    if (!res.ok || !res.business) return setError(t(res.error ?? "auth.err.server"));
    setBusiness(res.business);
    setEditing(false);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (business === undefined) {
    return <div className="biz-page"><p className="biz-hint">{t("common.loading")}</p></div>;
  }

  const showForm = !business || editing;
  const canEdit = business && business.status !== "approved";

  return (
    <div className="biz-page">
      <h1 className="biz-page-title">{t("biz.apply.title")}</h1>
      <p className="biz-page-lead">{t("biz.apply.lead")}</p>
      {done ? <p className="biz-ok">{t("biz.apply.sent")}</p> : null}
      {business ? <BusinessStatusCard business={business} showApplyLink={false} /> : null}
      {canEdit && !editing ? (
        <button type="button" className="biz-btn is-primary" onClick={() => { setEditing(true); setDone(false); }}>
          {business.status === "pending" ? t("biz.editApplication") : t("biz.reapply")}
        </button>
      ) : null}

      {showForm ? (
        <form className="biz-form" onSubmit={submit} noValidate={false}>
          <p className="biz-privacy">
            <ShieldCheck aria-hidden="true" />
            {t("biz.apply.privacy")}
          </p>
          <div className="biz-form-grid">
            <Field label={t("biz.f.name")}>
              <input className="dash-input" required minLength={2} maxLength={120} value={v.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label={t("biz.f.contactName")}>
              <input
                className="dash-input"
                required
                maxLength={80}
                autoComplete="name"
                value={v.contactName}
                onChange={(e) => set({ contactName: e.target.value })}
              />
            </Field>
            <Field label={t("biz.f.companyType")}>
              <select className="dash-input" value={v.companyType} onChange={(e) => set({ companyType: e.target.value as CompanyType })}>
                {COMPANY_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {t(`biz.type.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("biz.f.taxOffice")}>
              <input className="dash-input" required maxLength={60} value={v.taxOffice} onChange={(e) => set({ taxOffice: e.target.value })} />
            </Field>
            <Field label={t("biz.f.taxNumber")}>
              <input
                className="dash-input"
                required
                inputMode="numeric"
                maxLength={11}
                pattern="\d{10,11}"
                value={v.taxNumber}
                onChange={(e) => set({ taxNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              />
            </Field>
            <ProfileFields v={v} set={set} />
          </div>
          {error ? <p className="biz-err">{error}</p> : null}
          <div className="biz-form-actions">
            {editing ? (
              <button type="button" className="biz-btn" onClick={() => { setEditing(false); if (business) setV(fromBusiness(business)); }}>
                {t("common.cancel")}
              </button>
            ) : null}
            <button type="submit" className="biz-btn is-primary" disabled={busy}>
              {busy ? t("common.loading") : t("biz.apply.submit")}
            </button>
          </div>
          <p className="biz-hint">{t("biz.apply.free")}</p>
        </form>
      ) : null}

      <p className="biz-back">
        <Link href="/profil?p=kurumsal">{t("biz.backProfile")}</Link>
      </p>
    </div>
  );
}
