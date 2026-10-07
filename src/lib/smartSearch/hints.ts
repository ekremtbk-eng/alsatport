/** Home-page shortcut chips; each points at a real category node. */
export const SMART_HINTS = {
  ev: "emlak-konut",
  araba: "vasita-otomobil",
  usta: "services",
  is: "jobs",
  urun: "shopping",
} as const;
export type SmartHint = keyof typeof SMART_HINTS;

export type SmartChip = {
  labelKey: string;
  value?: string;
  min?: string;
  max?: string;
  unit?: "try" | "km" | "sqm";
};
