import type { Metadata } from "next";
import { listPublicStores } from "@/lib/business/store";
import { isBusinessCategory, isKnownCity, isKnownDistrict } from "@/lib/business/shared";
import { pageMetadata } from "@/lib/seo";
import { StoresDirectory } from "./StoresDirectory";

type Ctx = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

function readFilters(sp: Record<string, string | string[] | undefined>) {
  const kategori = one(sp.kategori);
  const il = one(sp.il);
  const ilce = one(sp.ilce);
  const categoryId = isBusinessCategory(kategori) ? kategori : "";
  const city = isKnownCity(il) ? il : "";
  const district = city && ilce && isKnownDistrict(city, ilce) ? ilce : "";
  return { categoryId, city, district, verified: one(sp.dogrulanmis) === "1" };
}

export async function generateMetadata({ searchParams }: Ctx): Promise<Metadata> {
  const f = readFilters(await searchParams);
  const filtered = !!(f.categoryId || f.city || f.verified);
  return pageMetadata({
    title: "Mağazalar · Doğrulanmış İşletmeler · AlsatPort",
    description: "AlsatPort'ta yönetici onaylı doğrulanmış işletme mağazaları. Kategoriye, ile ve ilçeye göre filtreleyin.",
    path: "/magazalar",
    index: !filtered,
    follow: true,
  });
}

export default async function StoresPage({ searchParams }: Ctx) {
  const f = readFilters(await searchParams);
  // Only admin-approved stores are ever public, so every listed store is verified.
  const stores = await listPublicStores(f);
  return <StoresDirectory stores={stores} filters={f} />;
}
