"use client";

import { useEffect, useState } from "react";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { useI18n } from "@/context/I18nContext";
import { apiGet } from "@/lib/security/client";

export function PlaceSelects({
  city,
  district,
  neighborhood,
  onCity,
  onDistrict,
  onNeighborhood,
  idPrefix = "reg",
}: {
  city: string;
  district: string;
  neighborhood: string;
  onCity: (value: string) => void;
  onDistrict: (value: string) => void;
  onNeighborhood: (value: string) => void;
  idPrefix?: string;
}) {
  const { t } = useI18n();
  const [hoods, setHoods] = useState<string[]>([]);
  const districts = city ? districtsOf(city) : [];

  useEffect(() => {
    if (!city || !district) {
      setHoods([]);
      return;
    }
    let cancel = false;
    const query = new URLSearchParams({ city, district });
    void apiGet<{ neighborhoods?: string[] }>(`/api/geo/neighborhoods?${query.toString()}`)
      .then((res) => {
        if (!cancel) setHoods(res.neighborhoods ?? []);
      })
      .catch(() => {
        if (!cancel) setHoods([]);
      });
    return () => {
      cancel = true;
    };
  }, [city, district]);

  return (
    <div className="auth-gate-place">
      <label className="auth-gate-label" htmlFor={`${idPrefix}-city`}>
        {t("auth.city")}
        <select
          id={`${idPrefix}-city`}
          className="auth-gate-input is-plain"
          value={city}
          onChange={(e) => {
            onCity(e.target.value);
            onDistrict("");
            onNeighborhood("");
          }}
        >
          <option value="">{t("auth.place.pick")}</option>
          {TURKEY_CITIES.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="auth-gate-label" htmlFor={`${idPrefix}-district`}>
        {t("auth.district")}
        <select
          id={`${idPrefix}-district`}
          className="auth-gate-input is-plain"
          value={district}
          disabled={!city}
          onChange={(e) => {
            onDistrict(e.target.value);
            onNeighborhood("");
          }}
        >
          <option value="">{t("auth.place.pick")}</option>
          {districts.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="auth-gate-label" htmlFor={`${idPrefix}-hood`}>
        {t("auth.neighborhood")}
        <select
          id={`${idPrefix}-hood`}
          className="auth-gate-input is-plain"
          value={neighborhood}
          disabled={!district || hoods.length === 0}
          onChange={(e) => onNeighborhood(e.target.value)}
        >
          <option value="">{t("auth.place.pick")}</option>
          {hoods.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
