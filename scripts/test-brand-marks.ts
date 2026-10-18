/**
 * Sanity checks for brand mark resolution (no network).
 * Run: npx tsx scripts/test-brand-marks.ts
 */
import { brandInitials, isBrandSelectField, resolveBrandMark } from "../src/lib/brandMarks";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok ", msg);
  }
}

assert(!!resolveBrandMark("BMW"), "BMW has mark");
assert(!!resolveBrandMark("Mercedes-Benz"), "Mercedes-Benz aliases to mark");
assert(!!resolveBrandMark("Apple (iPhone)"), "Apple (iPhone) resolves");
assert(!!resolveBrandMark("Samsung"), "Samsung has mark");
assert(!!resolveBrandMark("Yamaha"), "Yamaha → Yamaha Motor SI mark");
assert(resolveBrandMark("Yamaha")?.kind === "si", "Yamaha is Simple Icons mark");
assert(!!resolveBrandMark("MSI"), "MSI has SI mark");
assert(!!resolveBrandMark("DJI"), "DJI has SI mark");
assert(!!resolveBrandMark("BYD"), "BYD has manual mark");
assert(resolveBrandMark("BYD")?.kind === "file", "BYD is file mark");
assert(!!resolveBrandMark("Chery"), "Chery has manual mark");
assert(!!resolveBrandMark("Arçelik"), "Arçelik has manual mark");
assert(!!resolveBrandMark("Beko"), "Beko has manual mark");
assert(!!resolveBrandMark("Michelin"), "Michelin has manual mark");
assert(!!resolveBrandMark("Bridgestone"), "Bridgestone has manual mark");
assert(!!resolveBrandMark("Goodyear"), "Goodyear has simplified mark");
assert(!!resolveBrandMark("Realme"), "Realme has manual mark");
assert(!!resolveBrandMark("Togg"), "Togg has simplified mark");
assert(!!resolveBrandMark("Komatsu"), "Komatsu has simplified mark");
assert(!!resolveBrandMark("Liebherr"), "Liebherr has simplified mark");
assert(!!resolveBrandMark("Abarth"), "Abarth has simplified mark");
assert(!!resolveBrandMark("Alpine"), "Alpine (cars) has mark");
assert(resolveBrandMark("Alpine")?.kind === "file", "Alpine is NOT Alpine Linux SI");
assert(resolveBrandMark("Hidromek") === null, "Hidromek falls back (no trusted logo)");
assert(brandInitials("Hidromek").length === 2, "Hidromek initials length");
assert(brandInitials("Land Rover").length === 2, "Land Rover initials length");
// Commons File:GMC_logo.svg is Greater Manchester Council — never map vehicle GMC to it.
assert(resolveBrandMark("GMC") === null, "GMC falls back (wrong Commons file rejected)");
assert(brandInitials("GMC").length === 2, "GMC initials length");
assert(resolveBrandMark("Alfa Romeo") === null, "Alfa Romeo falls back (no marque badge SVG)");
assert(!!resolveBrandMark("AGV"), "AGV has manual mark");
assert(resolveBrandMark("AGV")?.kind === "file", "AGV is file mark");
assert(!!resolveBrandMark("Dodge"), "Dodge has manual mark");
assert(!!resolveBrandMark("Pirelli"), "Pirelli has manual mark");
assert(!!resolveBrandMark("Continental"), "Continental has manual mark");
assert(!!resolveBrandMark("Anker"), "Anker has manual mark");
assert(!!resolveBrandMark("SKF"), "SKF has manual mark");
assert(!!resolveBrandMark("Seiko"), "Seiko has manual mark");
assert(!!resolveBrandMark("Thule"), "Thule has manual mark");
assert(!!resolveBrandMark("Osram"), "Osram has manual mark");
assert(!!resolveBrandMark("Daihatsu"), "Daihatsu has manual mark");
assert(!!resolveBrandMark("Saab"), "Saab has manual mark");
assert(!!resolveBrandMark("Alpinestars"), "Alpinestars has manual mark");
assert(!!resolveBrandMark("Olympus"), "Olympus has manual mark");
assert(!!resolveBrandMark("Focal"), "Focal has manual mark");
assert(resolveBrandMark("Fabrikasyon") === null, "Fabrikasyon is generic — letter fallback");
assert(resolveBrandMark("Orijinal") === null, "Orijinal is generic — letter fallback");
assert(brandInitials("Fabrikasyon").length === 2, "Fabrikasyon initials length");
assert(brandInitials("Orijinal").length === 2, "Orijinal initials length");
assert(isBrandSelectField("brand"), "brand field");
assert(isBrandSelectField("partBrand"), "partBrand field");
assert(!isBrandSelectField("price"), "price is not brand");
assert(!isBrandSelectField("km"), "km is not brand");
assert(!isBrandSelectField("city"), "city is not brand");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll brand-mark tests passed.");
