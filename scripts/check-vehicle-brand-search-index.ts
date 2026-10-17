/**
 * Build-time / CI guard: slim search index must match VEHICLE_BRANDS names+models.
 * Fails the process on any drift so catalog edits cannot silently desync suggest.
 *
 *   npx tsx scripts/check-vehicle-brand-search-index.ts
 */
import { VEHICLE_BRANDS } from "../src/data/vehicleCatalog";
import { VEHICLE_BRAND_SEARCH_INDEX } from "../src/data/vehicleBrandSearchIndex";

type Issue = string;
const issues: Issue[] = [];

const expected = VEHICLE_BRANDS.map((b) => ({
  name: b.name,
  models: b.models.map((m) => m.name),
}));

if (expected.length !== VEHICLE_BRAND_SEARCH_INDEX.length) {
  issues.push(
    `brand count: catalog=${expected.length} index=${VEHICLE_BRAND_SEARCH_INDEX.length}`,
  );
}

const n = Math.max(expected.length, VEHICLE_BRAND_SEARCH_INDEX.length);
for (let i = 0; i < n; i++) {
  const cat = expected[i];
  const idx = VEHICLE_BRAND_SEARCH_INDEX[i];
  if (!cat) {
    issues.push(`extra index brand at [${i}]: ${idx?.name ?? "?"}`);
    continue;
  }
  if (!idx) {
    issues.push(`missing index brand at [${i}]: ${cat.name}`);
    continue;
  }
  if (cat.name !== idx.name) {
    issues.push(`brand[${i}] name: catalog="${cat.name}" index="${idx.name}"`);
  }
  if (cat.models.length !== idx.models.length) {
    issues.push(
      `brand "${cat.name}" model count: catalog=${cat.models.length} index=${idx.models.length}`,
    );
  }
  const m = Math.max(cat.models.length, idx.models.length);
  for (let j = 0; j < m; j++) {
    const cm = cat.models[j];
    const im = idx.models[j];
    if (cm !== im) {
      issues.push(`brand "${cat.name}" model[${j}]: catalog="${cm ?? "?"}" index="${im ?? "?"}"`);
    }
  }
}

if (issues.length) {
  console.error("FAIL  vehicleBrandSearchIndex parity vs VEHICLE_BRANDS:");
  for (const line of issues.slice(0, 40)) console.error(`  - ${line}`);
  if (issues.length > 40) console.error(`  … +${issues.length - 40} more`);
  process.exit(1);
}

const modelTotal = expected.reduce((s, b) => s + b.models.length, 0);
console.log(
  `PASS  vehicleBrandSearchIndex parity: ${expected.length} brands, ${modelTotal} models`,
);
