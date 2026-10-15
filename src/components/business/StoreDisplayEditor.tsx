"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { Field, ImagePicker } from "@/components/business/BusinessFormFields";
import { TEAM_LIMITS, type OwnerBusiness, type TeamMember } from "@/lib/business/shared";
import { apiPatch } from "@/lib/security/client";

/** Owner's display and contact choices plus the optional "Ekibimiz" list. Nothing here is pre-filled by the app. */
export function StoreDisplayEditor({ business, onSaved }: { business: OwnerBusiness; onSaved: (b: OwnerBusiness) => void }) {
  const { t } = useI18n();
  const [showContactName, setShowContactName] = useState(business.showContactName);
  const [showPhone, setShowPhone] = useState(business.showPhone);
  const [showEmail, setShowEmail] = useState(business.showEmail);
  const [team, setTeam] = useState<TeamMember[]>(business.team);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const setMember = (i: number, patch: Partial<TeamMember>) =>
    setTeam((cur) => cur.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await apiPatch<{ ok?: boolean; error?: string; business?: OwnerBusiness }>("/api/account/business", {
      showContactName,
      showPhone,
      showEmail,
      team: team
        .map((m) => ({ name: m.name.trim(), role: m.role.trim(), ...(m.photo ? { photo: m.photo } : {}) }))
        .filter((m) => m.name || m.role || m.photo),
    });
    setBusy(false);
    if (!res.ok || !res.business) return setError(t(res.error ?? "auth.err.server"));
    setTeam(res.business.team);
    onSaved(res.business);
    setSaved(true);
  }

  return (
    <section className="biz-card">
      <h2>{t("biz.display.title")}</h2>
      <p className="biz-hint">{t("biz.display.hint")}</p>
      <form className="biz-form" onSubmit={save}>
        <fieldset className="biz-fx">
          <legend>{t("biz.contact")}</legend>
          <label className="biz-fx-check">
            <input type="checkbox" checked={showContactName} onChange={(e) => setShowContactName(e.target.checked)} />
            {t("biz.display.contactName", { name: business.contactName })}
          </label>
          <label className="biz-fx-check">
            <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
            {t("biz.display.phone")}
          </label>
          <label className="biz-fx-check">
            <input type="checkbox" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)} />
            {t("biz.display.email")}
          </label>
        </fieldset>

        <fieldset className="biz-fx">
          <legend>{t("biz.nav.team")}</legend>
          <p className="biz-hint">{t("biz.team.hint")}</p>
          {team.map((m, i) => (
            <div key={i} className="biz-team-row">
              <ImagePicker kind="team" value={m.photo ?? ""} onChange={(url) => setMember(i, { photo: url })} />
              <div className="biz-team-fields">
                <Field label={t("biz.team.name")}>
                  <input
                    className="dash-input"
                    maxLength={TEAM_LIMITS.name}
                    value={m.name}
                    onChange={(e) => setMember(i, { name: e.target.value })}
                    required
                    minLength={2}
                  />
                </Field>
                <Field label={t("biz.team.role")}>
                  <input className="dash-input" maxLength={TEAM_LIMITS.role} value={m.role} onChange={(e) => setMember(i, { role: e.target.value })} />
                </Field>
                <button type="button" className="biz-link" onClick={() => setTeam((cur) => cur.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden="true" className="inline h-3.5 w-3.5" /> {t("biz.team.remove")}
                </button>
              </div>
            </div>
          ))}
          {team.length < TEAM_LIMITS.members ? (
            <button type="button" className="biz-btn" onClick={() => setTeam((cur) => [...cur, { name: "", role: "" }])}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t("biz.team.add")}
            </button>
          ) : null}
        </fieldset>

        {error ? <p className="biz-err">{error}</p> : null}
        {saved ? <p className="biz-ok">{t("biz.saved")}</p> : null}
        <div className="biz-form-actions">
          <button type="submit" className="biz-btn is-primary" disabled={busy}>
            {busy ? t("common.loading") : t("biz.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
