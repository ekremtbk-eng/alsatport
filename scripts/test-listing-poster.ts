/**
 * Poster logic checks: deal detection, dynamic features, price, phone, QR → canonical URL.
 * QR decoding needs jsqr outside the project: QR_DECODER_DIR=<dir with node_modules/jsqr>.
 */
import { createRequire } from "node:module";
import path from "node:path";
import qrcode from "qrcode-generator";
import type { Listing } from "@/data/store";
import { posterDeal, posterFeatures, posterPhone, posterPrice, posterSupported, posterTemplateAllowed } from "@/lib/poster";
import { listingPublicUrl } from "@/lib/shareListing";

let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(detail)}`}`);
}

function listing(categoryId: string, specs: [string, string][], extra: Partial<Listing> = {}): Listing {
  return {
    id: "12276129",
    categoryId,
    title: "Test",
    price: 4250000,
    city: "Ankara",
    district: "Çankaya",
    images: [],
    specs: specs.map(([label, value]) => ({ label, value })),
    ...extra,
  } as Listing;
}

const sale = listing("emlak-konut-satilik-daire", [
  ["m²", "145"],
  ["Oda", "3+1"],
  ["Kat", "2"],
  ["Isıtma", "Doğalgaz (Kombi)"],
  ["Balkon", "Var"],
  ["Asansör", "Yok"],
]);
check("satılık category → sale", posterDeal(sale).deal === "sale", posterDeal(sale));
check("emlak supported", posterSupported(sale));
check("vasıta not yet supported", !posterSupported(listing("vasita-otomobil", [])));
const feats = posterFeatures(sale).map((f) => f.text);
check("features from real specs in priority order", JSON.stringify(feats) === JSON.stringify(["3+1", "145 m²", "2. Kat", "Doğalgaz (Kombi)", "Balkonlu"]), feats);
check("Yok values skipped", !feats.some((f) => /Asansör/.test(f)), feats);

const rent = listing("emlak-konut-kiralik-daire", [["Kat", "Zemin"], ["Otopark", "Kapalı Otopark"], ["Eşyalı", "Evet"], ["Site içerisinde", "Hayır"]], { price: 18000 });
check("kiralık category → rent / month", posterDeal(rent).deal === "rent" && posterDeal(rent).period === "month", posterDeal(rent));
check("rent price suffix", posterPrice(18000, posterDeal(rent).period).replace(/\s/g, " ") === "₺18.000 / Ay", posterPrice(18000, "month"));
check("sale price", posterPrice(4250000, null).replace(/\s/g, " ") === "₺4.250.000", posterPrice(4250000, null));
const rentFeats = posterFeatures(rent).map((f) => f.text);
check("rent feature formatting", JSON.stringify(rentFeats) === JSON.stringify(["Zemin Kat", "Kapalı Otopark", "Eşyalı"]), rentFeats);

const daily = listing("emlak-konut-gunluk", []);
check("günlük → rent / day", posterDeal(daily).period === "day", posterDeal(daily));
const specOnly = listing("emlak-konut", [["İlan tipi", "Kiralık"]]);
check("spec fallback when category has no deal", posterDeal(specOnly).deal === "rent", posterDeal(specOnly));
const conflict = listing("emlak-konut-satilik", [["İlan tipi", "Kiralık"]]);
check("category wins over conflicting spec", posterDeal(conflict).deal === "sale", posterDeal(conflict));
const unknown = listing("emlak-proje", []);
check("unknown deal → no deal word", posterDeal(unknown).deal === null);
check("only matching template allowed", posterTemplateAllowed("sale", "sale") && !posterTemplateAllowed("rent", "sale") && posterTemplateAllowed("plain", null) && !posterTemplateAllowed("sale", null));

check("phone national format", posterPhone("+90 532 111 22 33") === "0532 111 22 33", posterPhone("+90 532 111 22 33"));

const url = listingPublicUrl(sale.id);
check("canonical URL, no tracking", url === "https://alsatport.com/ilan/12276129", url);

const decoderDir = process.env.QR_DECODER_DIR;
if (decoderDir) {
  const req = createRequire(path.join(decoderDir, "noop.js"));
  const jsQR = req("jsqr") as (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const px = 8;
  const size = (n + 8) * px;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c))
        for (let y = 0; y < px; y++)
          for (let x = 0; x < px; x++) {
            const i = (((r + 4) * px + y) * size + (c + 4) * px + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
  const decoded = jsQR(data, size, size)?.data;
  check("QR decodes to canonical URL", decoded === url, decoded);
}

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
