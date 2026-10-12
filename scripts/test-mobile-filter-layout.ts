/**
 * Mobile filter layout invariants (no DB, no server):
 * - only opted-in categories get the new layout; every other category keeps the current panel;
 * - every filter the old panel offers for that category is reachable exactly once in the new one;
 * - country-specific (KKTC) fields appear only while that country is chosen;
 * - each row maps to URL keys the filter state actually uses.
 *
 * Run: npx tsx scripts/test-mobile-filter-layout.ts
 */
import { categories, walkCategories, type Category } from "@/data/categories";
import { emptyFilterState, fieldOffered, filterFieldsForCategory, type FilterState } from "@/lib/categoryFilters";
import { mobileFilterLayout, PSEUDO_ROW_KEYS, resolveMobileLayout, rowStateKeys } from "@/lib/mobileFilters";

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

const opted = all.filter((c) => mobileFilterLayout(c));
check("only Otomobil is opted in", opted.length === 1 && opted[0].id === "vasita-otomobil", opted.map((c) => c.id).join(","));
check("categories without a layout keep the old panel", all.filter((c) => c.id !== "vasita-otomobil").every((c) => !mobileFilterLayout(c)));
check("null category has no layout", mobileFilterLayout(null) === null && mobileFilterLayout(undefined) === null);

const STATES: Record<string, FilterState> = {
  empty: emptyFilterState(),
  tr: { ...emptyFilterState(), country: "tr" },
  kktc: { ...emptyFilterState(), country: "kktc" },
  brand: { ...emptyFilterState(), brand: "BMW" },
};

for (const cat of opted) {
  const layout = mobileFilterLayout(cat)!;
  const fields = filterFieldsForCategory(cat);
  const pseudoOwned = new Set(Object.values(PSEUDO_ROW_KEYS).flat());
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

    check(`${cat.id}/${label}: quick tab starts with Marka, Seri, Fiyat, Yıl, Km`, ["brand", "model", "priceMin", "yearMin", "kmMin"].every((k, i) => resolved.quick[i]?.key === k), resolved.quick.map((r) => r.key).join(","));
    check(`${cat.id}/${label}: quick tab has location`, resolved.quick.some((r) => r.key === "location"));
    check(`${cat.id}/${label}: no auto "other" group needed`, !resolved.groups.some((g) => g.id === "other"), resolved.groups.find((g) => g.id === "other")?.rows.map((r) => r.key).join(","));
  }

  const kktc = resolveMobileLayout(layout, fields, STATES.kktc);
  const kktcFields = fields.filter((f) => !fieldOffered(f, STATES.tr) && fieldOffered(f, STATES.kktc)).map((f) => f.key);
  const kktcGroup = kktc.groups.find((g) => g.id === "kktc");
  check(`${cat.id}: KKTC fields exist`, kktcFields.length > 0);
  check(`${cat.id}: KKTC group shows only with KKTC`, Boolean(kktcGroup) && !resolveMobileLayout(layout, fields, STATES.tr).groups.some((g) => g.id === "kktc"));
  check(`${cat.id}: price row owns min, max and currency`, rowStateKeys({ key: "priceMin", field: fields.find((f) => f.key === "priceMin") }).join() === "priceMin,priceMax,currency");
}

console.log(`\nmobile filter layout: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
