import { addons, packages } from "@/data/store";
import type { PaidShopProduct } from "@/lib/entitlements";

export function productPriceTry(product: PaidShopProduct) {
  const row = [...packages, ...addons].find((p) => p.id === product);
  return row?.price ?? 0;
}

export function productTitle(product: PaidShopProduct) {
  if (product === "vip") return "AlsatPort VIP";
  if (product === "profesyonel") return "AlsatPort Profesyonel";
  return "AlsatPort Doping";
}
