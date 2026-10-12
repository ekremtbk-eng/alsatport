/**
 * Mobile filter layout invariants (no DB, no server):
 * - categories with the advanced estate/vehicle dialog keep their current panel; every other category gets the new one;
 * - every filter the old panel offers for a category is reachable exactly once in the new one;
 * - country-specific (KKTC) fields appear only while that country is chosen;
 * - the quick tab stays short and always has location (and price where the category has one);
 * - each row maps to URL keys the filter state actually uses; price presets fit the category.
 *
 * Run: npx tsx scripts/test-mobile-filter-layout.ts
 */
import { categories, rootOf, walkCategories, type Category } from "@/data/categories";
import { emptyFilterState, fieldOffered, filterFieldsForCategory, hasAdvancedFilters, type FilterState } from "@/lib/categoryFilters";
import { mobileFilterLayout, PSEUDO_ROW_KEYS, rangeBuckets, resolveMobileLayout, rowStateKeys } from "@/lib/mobileFilters";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass += 1;
  else {
    fail += 1;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const all: Category[] = [];
walkCategories(categories, (c) => {
  all.push(c);
});

const advanced = all.filter((c) => hasAdvancedFilters(c));
const opted = all.filter((c) => mobileFilterLayout(c));
check("every category gets the new panel", opted.length === all.length, `${opted.length} of ${all.length}`);
check(
  "advanced-dialog categories keep the dialog's group titles",
  advanced.every((c) => mobileFilterLayout(c)!.groups.every((g) => g.labelKey === `flt.grp.${g.id}`)),
);
check("Otomobil is opted in", opted.some((c) => c.id === "vasita-otomobil"));
check("null category has no layout", mobileFilterLayout(null) === null && mobileFilterLayout(undefined) === null);

const STATES: Record<string, FilterState> = {
  empty: emptyFilterState(),
  tr: { ...emptyFilterState(), country: "tr" },
  kktc: { ...emptyFilterState(), country: "kktc" },
  brand: { ...emptyFilterState(), brand: "BMW" },
};
const pseudoOwned = new Set(Object.values(PSEUDO_ROW_KEYS).flat());

for (const cat of opted) {
  const layout = mobileFilterLayout(cat)!;
  const fields = filterFieldsForCategory(cat);
  for (const [label, state] of Object.entries(STATES)) {
    const resolved = resolveMobileLayout(layout, fields, state);
    const rows = [...resolved.quick, ...resolved.groups.flatMap((g) => g.rows)];
    const keys = rows.map((r) => r.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    check(`${cat.id}/${label}: no row listed twice`, dupes.length === 0, dupes.join(","));

    const reachable = new Set(rows.flatMap((r) => rowStateKeys(r)));
    for (const k of pseudoOwned) if (keys.some((rk) => PSEUDO_ROW_KEYS[rk as keyof typeof PSEUDO_ROW_KEYS]?.includes(k))) reachable.add(k);
    const offered = fields.filter((f) => fieldOffered(f, state));
    const missing = offered.filter((f) => !reachable.has(f.key)).map((f) => f.key);
    check(`${cat.id}/${label}: every offered filter is reachable`, missing.length === 0, missing.join(","));

    const hidden = fields.filter((f) => !fieldOffered(f, state)).map((f) => f.key);
    const leaked = keys.filter((k) => hidden.includes(k));
    check(`${cat.id}/${label}: country-specific filters stay hidden`, leaked.length === 0, leaked.join(","));

    check(`${cat.id}/${label}: quick tab has location`, resolved.quick.some((r) => r.key === "location"));
    check(`${cat.id}/${label}: quick tab has at most 7 rows`, resolved.quick.length <= 7, String(resolved.quick.length));
    if (fields.some((f) => f.key === "priceMin")) check(`${cat.id}/${label}: quick tab has price`, resolved.quick.some((r) => r.key === "priceMin"));
    check(`${cat.id}/${label}: no auto "other" group needed`, !resolved.groups.some((g) => g.id === "_rest"), resolved.groups.find((g) => g.id === "_rest")?.rows.map((r) => r.key).join(","));
    check(`${cat.id}/${label}: std rows (date, map, keyword, category) present`, ["posted", "mappedOnly", "keyword", "category"].every((k) => keys.includes(k)));
  }
}

const oto = all.find((c) => c.id === "vasita-otomobil")!;
const otoFields = filterFieldsForCategory(oto);
const otoLayout = mobileFilterLayout(oto)!;
for (const [label, state] of Object.entries(STATES)) {
  const q = resolveMobileLayout(otoLayout, otoFields, state).quick.map((r) => r.key);
  check(`otomobil/${label}: quick tab starts with Marka, Seri, Fiyat, Yıl, Km`, ["brand", "model", "priceMin", "yearMin", "kmMin"].every((k, i) => q[i] === k), q.join(","));
}
const kktcFields = otoFields.filter((f) => !fieldOffered(f, STATES.tr) && fieldOffered(f, STATES.kktc)).map((f) => f.key);
check("otomobil: KKTC fields exist", kktcFields.length > 0);
check(
  "otomobil: KKTC group shows only with KKTC",
  resolveMobileLayout(otoLayout, otoFields, STATES.kktc).groups.some((g) => g.id === "kktc") &&
    !resolveMobileLayout(otoLayout, otoFields, STATES.tr).groups.some((g) => g.id === "kktc"),
);
check("otomobil: price row owns min, max and currency", rowStateKeys({ key: "priceMin", field: otoFields.find((f) => f.key === "priceMin") }).join() === "priceMin,priceMax,currency");

const byRoot = new Map<string, string>();
for (const cat of opted) {
  const b = rangeBuckets("priceMin", cat);
  const nums = b.flatMap(([a, z]) => [a, z]).filter(Boolean).map(Number);
  check(`${cat.id}: price presets ascend`, nums.every((n, i) => i === 0 || n >= nums[i - 1]), JSON.stringify(b));
  byRoot.set(rootOf(cat).id, JSON.stringify(b));
}
check("price presets differ between cars, shopping and services", new Set([byRoot.get("vasita"), byRoot.get("shopping"), byRoot.get("services")]).size === 3);
check("Otomobil price presets unchanged", rangeBuckets("priceMin", oto)[0].join() === ",250000" && rangeBuckets("priceMin", oto).length === 6);

console.log(`\nmobile filter layout: ${pass}/${pass + fail} passed (${opted.length} categories)`);
if (fail) process.exit(1);
