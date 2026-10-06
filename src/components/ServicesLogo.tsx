"use client";

import { useI18n } from "@/context/I18nContext";
import { BRAND_MARK_SRC } from "@/lib/brand";

export function ServicesLogo() {
  const { t } = useI18n();
  const label = t("cat.services");
  const cut = label.search(/\s/);
  const top = cut === -1 ? label : label.slice(0, cut);
  const rest = cut === -1 ? "" : label.slice(cut + 1);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND_MARK_SRC} alt="" className="brand-mark svc-logo-mark" width={44} height={44} decoding="async" />
      <span className="svc-logo-text">
        <span className="svc-logo-title">{top}</span>
        {rest ? <span className="svc-logo-sub">{rest}</span> : null}
      </span>
    </>
  );
}
