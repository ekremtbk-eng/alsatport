import type { VehicleSegment } from "./vehicleIndex";

export const VEHICLE_REQUEST_SEGMENTS = [
  "auto",
  "suv",
  "ev",
  "moto",
  "van",
  "ticari",
  "deniz",
  "atv",
  "utv",
  "air",
  "caravan",
  "classic",
] as const satisfies readonly VehicleSegment[];

export const VEHICLE_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type VehicleRequestStatus = (typeof VEHICLE_REQUEST_STATUSES)[number];

/** An admin-accepted catalog addition. Names are user-entered and only reviewed, never "officially verified". */
export type ApprovedVehicle = {
  segment: VehicleSegment;
  brand: string;
  model: string;
  series: string;
  engine: string;
};

export type AdminVehicleRequest = ApprovedVehicle & {
  id: string;
  yearFrom: number | null;
  yearTo: number | null;
  note: string;
  status: VehicleRequestStatus;
  rejectReason: string | null;
  username: string;
  createdAt: number;
  reviewedAt: number | null;
};

const same = (a: string, b?: string) => a.toLocaleLowerCase("tr") === (b ?? "").toLocaleLowerCase("tr");

function uniq(values: string[]) {
  const out: string[] = [];
  for (const v of values) if (v && !out.some((o) => same(o, v))) out.push(v);
  return out;
}

/**
 * Adds approved request names to a cascade level of the listing form. Catalog options keep their order; approved
 * names are appended only when missing, so existing selections never change meaning.
 */
export function withApprovedOptions(
  level: "brand" | "model" | "trim" | "engine",
  options: string[],
  approved: ApprovedVehicle[] | undefined,
  segment: VehicleSegment,
  attrs: Record<string, string>,
) {
  if (!approved?.length) return options;
  const rows = approved.filter((a) => a.segment === segment);
  let extra: string[] = [];
  if (level === "brand") extra = rows.map((a) => a.brand);
  else if (level === "model") extra = rows.filter((a) => same(a.brand, attrs.brand)).map((a) => a.model);
  else {
    const line = rows.filter((a) => same(a.brand, attrs.brand) && same(a.model, attrs.model));
    extra = line.map((a) => (level === "trim" ? a.series : a.engine));
  }
  const add = uniq(extra).filter((v) => !options.some((o) => same(o, v)));
  return add.length ? [...options, ...add] : options;
}

/** True when brand / model (and series, when given) match an approved request of the segment. */
export function isApprovedCombo(
  approved: ApprovedVehicle[] | undefined,
  combo: { segment: VehicleSegment; brand?: string; model?: string; trim?: string },
) {
  return Boolean(
    approved?.some(
      (a) =>
        a.segment === combo.segment &&
        same(a.brand, combo.brand) &&
        same(a.model, combo.model) &&
        (!combo.trim || same(a.series, combo.trim)),
    ),
  );
}
