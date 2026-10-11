"use client";

import { useI18n } from "@/context/I18nContext";
import { COUNTRY_PICK, KKTC_REGION_NAMES, TURKEY_CITY_NAMES } from "@/data/locations";

/**
 * `<option>`s for a native city select, grouped by country. With `countryPicks`, "Türkiye (tümü)" and
 * "KKTC (tümü)" are offered as well; their values are `COUNTRY_PICK` entries handled by `applyLocationPick`.
 */
export function LocationOptions({ countryPicks = false }: { countryPicks?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {countryPicks ? (
        <>
          <option value={COUNTRY_PICK.TR}>{t("loc.trAll")}</option>
          <option value={COUNTRY_PICK.KKTC}>{t("loc.kktcAll")}</option>
        </>
      ) : null}
      <optgroup label={t("loc.trGroup")}>
        {TURKEY_CITY_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("loc.kktc")}>
        {KKTC_REGION_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </optgroup>
    </>
  );
}
