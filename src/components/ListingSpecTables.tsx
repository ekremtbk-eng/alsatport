"use client";

import { ChassisMap } from "@/components/ChassisMap";
import { FeatureGrid } from "@/components/FeatureGrid";
import {
  chassisSummary,
  emptyChassis,
  highlightSpecs,
  type ListingSchema,
} from "@/data/listingSchema";
import type { Listing } from "@/data/store";

const ESTATE_TABLE = ["m²", "Net m²", "Oda", "Kat", "Isıtma", "Bina yaşı", "Cephe"];
const VEHICLE_TABLE = [
  "Motor gücü",
  "Motor hacmi",
  "Vites",
  "Motor",
  "Yakıt",
  "Kasa",
  "Çekiş",
  "Km",
  "Yıl",
  "Menzil",
  "Batarya",
  "Şarj",
  "Yük",
  "Ağırlık",
  "Silindir",
  "Soğutma",
  "Kimden",
];
const SERVICE_TABLE = ["Hizmet yeri", "Çalışma", "Süre", "Garanti", "Deneyim", "Fatura", "Yer"];

function pickByLabels(specs: { label: string; value: string }[], labels: string[]) {
  const map = new Map(specs.map((s) => [s.label, s]));
  return labels.map((l) => map.get(l)).filter(Boolean) as { label: string; value: string }[];
}

function SpecTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="spec-card">
      <h2 className="spec-card-h">{title}</h2>
      <dl className="spec-table">
        {rows.map((s) => (
          <div key={s.label} className="spec-row">
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const FAMILY_TABLE_TITLE: Partial<Record<ListingSchema["family"], string>> = {
  emlak: "Konut bilgileri",
  vasita: "Araç teknik bilgileri",
  hizmet: "Hizmet bilgileri",
};

export function listingSpecSections(listing: Listing, schema: ListingSchema) {
  const specs = listing.specs ?? [];
  const hi = highlightSpecs(specs, schema.family);
  const estateRows = schema.family === "emlak" ? pickByLabels(specs, ESTATE_TABLE) : [];
  const vehicleRows = schema.family === "vasita" ? pickByLabels(specs, VEHICLE_TABLE) : [];
  const serviceRows = schema.family === "hizmet" ? pickByLabels(specs, SERVICE_TABLE) : [];
  const familyRows =
    schema.family === "emlak" ? estateRows : schema.family === "vasita" ? vehicleRows : schema.family === "hizmet" ? serviceRows : [];
  const used = new Set(familyRows.map((r) => r.label));
  const rest = used.size ? specs.filter((s) => !used.has(s.label)) : specs;
  return {
    hi,
    family: { title: FAMILY_TABLE_TITLE[schema.family] ?? "", rows: familyRows },
    estateRows,
    vehicleRows,
    serviceRows,
    rest,
  };
}

export function ListingSpecTables({
  listing,
  schema,
}: {
  listing: Listing;
  schema: ListingSchema;
}) {
  const { hi, estateRows, vehicleRows, serviceRows, rest } = listingSpecSections(listing, schema);

  return (
    <div className="spec-wrap">
      {hi.length > 0 ? (
        <div className="spec-hi">
          {hi.map((s) => (
            <div key={s.label} className="spec-hi-cell">
              <p className="spec-hi-l">{s.label}</p>
              <p className="spec-hi-v">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {schema.family === "emlak" ? <SpecTable title="Konut bilgileri" rows={estateRows} /> : null}
      {schema.family === "vasita" ? <SpecTable title="Araç teknik bilgileri" rows={vehicleRows} /> : null}
      {schema.family === "hizmet" ? <SpecTable title="Hizmet bilgileri" rows={serviceRows} /> : null}
      <SpecTable title="İlan bilgileri" rows={rest} />

      {schema.chassis ? (
        <section className="spec-card">
          <h2 className="spec-card-h">Şasi durumu — boyalı / değişen parça</h2>
          <p className="spec-card-sub">
            {(() => {
              const s = chassisSummary(listing.chassis ?? emptyChassis());
              return `${s.painted} boyalı · ${s.changed} değişen · ${s.local} lokal boya`;
            })()}
          </p>
          <ChassisMap value={listing.chassis ?? emptyChassis()} readOnly />
        </section>
      ) : null}

      {schema.groups.length > 0 ? (
        <section>
          <h2 className="spec-card-h mb-3">
            {schema.family === "vasita" ? "Donanım listesi" : schema.family === "hizmet" ? "Hizmet özellikleri" : "Özellikler"}
          </h2>
          <FeatureGrid groups={schema.groups} selected={listing.features ?? []} readOnly />
        </section>
      ) : null}
    </div>
  );
}
