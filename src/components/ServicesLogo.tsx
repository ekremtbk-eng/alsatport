"use client";

import { useId } from "react";
import { useI18n } from "@/context/I18nContext";

export function ServicesLogo() {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, "");
  const g = `uh-gold-${uid}`;
  const label = t("cat.services");
  const cut = label.search(/\s/);
  const top = cut === -1 ? label : label.slice(0, cut);
  const rest = cut === -1 ? "" : label.slice(cut + 1);

  return (
    <>
      <svg className="svc-logo-mark" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id={g} x1="6" y1="0" x2="44" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFEE7A" />
            <stop offset="0.45" stopColor="#F5C400" />
            <stop offset="1" stopColor="#C58A00" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill={`url(#${g})`} />
        <path
          d="M18 9.5c-4.4 0-8 3.5-8 7.8 0 2.4 1.1 4.5 2.8 5.9V29.2c0 8.1 6.1 14.3 14.2 14.3 8.2 0 14.3-6.2 14.3-14.3V23.2h-6.2V29.2c0 4.6-3.5 8.1-8.1 8.1-4.5 0-8-3.5-8-8.1v-7.4c2.2-1.3 3.6-3.6 3.6-6.3 0-4.3-3.6-7.8-8-7.8Z"
          fill="#171717"
        />
        <circle cx="18" cy="17.3" r="3.15" fill={`url(#${g})`} />
        <rect x="30.4" y="8.2" width="11.4" height="6.3" rx="1.4" transform="rotate(-28 36.1 11.35)" fill="#171717" />
        <rect x="34.2" y="13.6" width="3.4" height="7.2" rx="1.1" transform="rotate(-28 35.9 17.2)" fill="#171717" />
      </svg>
      <span className="svc-logo-text">
        <span className="svc-logo-title">{top}</span>
        {rest ? <span className="svc-logo-sub">{rest}</span> : null}
      </span>
    </>
  );
}
