/**
 * Verify every category.icon in the tree resolves in CategoryIcon MAP.
 * Run: npx tsx scripts/audit-category-icons.ts
 */
import { categories } from "../src/data/categories";

// Mirror CategoryIcon MAP keys (keep in sync — fails if unknown icon used)
const KNOWN = new Set([
  "smartphone", "laptop", "sofa", "shirt", "car", "suv", "van", "building", "buildings",
  "home", "hotel", "store", "land", "palmtree", "tent", "plane", "access", "cpu", "bike",
  "gamepad", "truck", "paw", "grid", "headphones", "monitor", "tablet", "key", "wrench",
  "zap", "clock", "calendar", "refresh", "shield", "stethoscope", "user-search", "sparkles",
  "megaphone", "star", "flame", "ship", "sail", "anchor", "compass", "wind", "cog", "bag",
  "camera", "cake", "printer", "recycle", "search", "flag", "tv", "plug", "watch", "baby",
  "book", "music", "gem", "archive", "landmark", "trees", "tractor", "factory", "hammer",
  "paint", "graduation", "languages", "scale", "ticket", "users", "bone", "fish", "bird",
  "heart-handshake", "heart", "briefcase", "utensils", "circle", "warehouse", "crown",
  "scissors", "footprints", "cloud",
]);

type Cat = { id?: string; name?: string; icon?: string; children?: Cat[]; subCategories?: Cat[] };

const unknown: string[] = [];
const missingIcon: string[] = [];
let total = 0;

function walk(nodes: Cat[] | undefined, path: string) {
  for (const n of nodes ?? []) {
    total += 1;
    const label = `${path}/${n.name ?? n.id ?? "?"}`;
    if (!n.icon) missingIcon.push(label);
    else if (!KNOWN.has(n.icon)) unknown.push(`${label} → ${n.icon}`);
    walk(n.children ?? n.subCategories, label);
  }
}

walk(categories as Cat[], "");

console.log(`categories scanned: ${total}`);
console.log(`missing icon field: ${missingIcon.length}`);
console.log(`unknown icon names: ${unknown.length}`);
if (missingIcon.length) console.log(missingIcon.slice(0, 30).join("\n"));
if (unknown.length) console.log(unknown.slice(0, 30).join("\n"));
if (unknown.length || missingIcon.length) process.exit(1);
console.log("All category icons resolve.");
