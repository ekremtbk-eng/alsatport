import type { VehicleBrand, VehicleModelLine } from "./vehicleCatalog";

/**
 * Japanese/UK-market (mostly right-hand drive) models that are sold in KKTC but missing from the base catalog.
 * Every entry was seen in live KKTC classifieds (kktcarabam.com, kibrisarabaal.com, kktcar.com, buykibris.com,
 * 2026-10). Packages and engines are deliberately empty: they are not verified per model, so the form never
 * offers guessed trims and the cascade stays optional.
 */
function m(name: string, bodies: string[]): VehicleModelLine {
  return { name, packages: [], engines: [], bodies };
}

const HB = ["Hatchback"];
const SD = ["Sedan"];
const SW = ["Station Wagon"];
const SUV = ["SUV"];
const CP = ["Coupe"];
const MP = ["MPV"];

const BRANDS: { name: string; models: VehicleModelLine[] }[] = [
  {
    name: "Toyota",
    models: [
      m("Vitz", HB),
      m("Aqua", HB),
      m("Passo", HB),
      m("Corolla Axio", SD),
      m("Premio", SD),
      m("Celica", CP),
      m("Sienta", MP),
      m("Noah", MP),
      m("Voxy", MP),
      m("Alphard", MP),
      m("Raize", SUV),
      m("Yaris Cross", SUV),
      m("Corolla Cross", SUV),
      m("Harrier", SUV),
    ],
  },
  {
    name: "Nissan",
    models: [m("March", HB), m("Dayz", HB), m("Tiida", ["Hatchback", "Sedan"]), m("Serena", MP), m("Kicks", SUV)],
  },
  {
    name: "Honda",
    models: [m("Fit", HB), m("Shuttle", SW), m("Freed", MP), m("Integra", CP), m("Vezel", SUV), m("WR-V", SUV)],
  },
  { name: "Mazda", models: [m("Demio", HB), m("Axela", ["Hatchback", "Sedan"]), m("CX-8", SUV)] },
  { name: "Daihatsu", models: [m("Mira", HB), m("Boon", HB)] },
  { name: "Suzuki", models: [m("Solio", MP)] },
  { name: "Hyundai", models: [m("Getz", HB)] },
  { name: "Vauxhall", models: [m("Corsa", HB), m("Astra", ["Hatchback", "Station Wagon"])] },
];

export const KKTC_MARKET_BRANDS: VehicleBrand[] = BRANDS.map((b) => ({
  name: b.name,
  models: b.models,
  series: b.models.map((x) => ({ name: x.name, models: x.packages })),
}));

/** Adds market models to the base catalog without touching existing brands, models or their order. */
export function withKktcMarket(base: VehicleBrand[]): VehicleBrand[] {
  const out = base.map((b) => ({ ...b }));
  for (const extra of KKTC_MARKET_BRANDS) {
    const key = extra.name.toLocaleLowerCase("tr");
    const prev = out.find((b) => b.name.toLocaleLowerCase("tr") === key);
    if (!prev) {
      out.push(extra);
      continue;
    }
    const names = new Set(prev.models.map((x) => x.name.toLocaleLowerCase("tr")));
    const added = extra.models.filter((x) => !names.has(x.name.toLocaleLowerCase("tr")));
    if (!added.length) continue;
    prev.models = [...prev.models, ...added];
    prev.series = [...(prev.series ?? []), ...added.map((x) => ({ name: x.name, models: x.packages }))];
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "en"));
}
