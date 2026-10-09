/**
 * Brand kit page: only real /public brand files, every download reachable, indexable page.
 * Read-only (GET requests only), so it may also run against production:
 *
 *   BRANDKIT_TEST_BASE=http://localhost:3013 npx tsx scripts/test-brand-kit.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_KIT, BRAND_KIT_SLOGAN } from "@/lib/brandKit";
import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_LOGO_SRC, BRAND_MARK_SRC } from "@/lib/brand";
import { MESSAGES } from "@/i18n/messages";

const BASE = (process.env.BRANDKIT_TEST_BASE ?? "http://localhost:3013").replace(/\/$/, "");
const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const files = BRAND_KIT.flatMap((i) => i.files);

function unitTests() {
  const missing = files.filter((f) => !f.src.startsWith("/") || !existsSync(join("public", f.src)));
  check("K1", "Every download is a local file under /public", missing.length === 0, missing.map((f) => f.src).join(", "));
  const external = BRAND_KIT.filter((i) => /^https?:|blob|unsplash|uploads/i.test(i.preview + i.files.map((f) => f.src).join()));
  check("K2", "No external, demo or user-upload sources", external.length === 0);
  const names = files.map((f) => f.download);
  check("K3", "Friendly, unique alsatport-* download names", new Set(names).size === names.length && names.every((n) => /^alsatport-[a-z0-9-]+\.(png|jpg|ico)$/.test(n)), names.join(", "));
  const used = [BRAND_LOGO_LIGHT.src, BRAND_LOGO_DARK.src, BRAND_MARK_SRC, BRAND_LOGO_SRC, "/favicon.ico", "/favicon-48x48.png", "/og.png"];
  check("K4", "Kit = exactly the brand files the site already uses", files.every((f) => used.includes(f.src)) && used.every((u) => files.some((f) => f.src === u)));
  const svgOffered = files.some((f) => f.src.endsWith(".svg"));
  check("K5", "No SVG offered (project SVGs only wrap a raster PNG)", !svgOffered && /<image/.test(readFileSync("public/logo.svg", "utf8")));
  const footerSlogan = (MESSAGES.tr["footer.tagline"] ?? "").trim();
  check("K6", "Slogan is the one the site uses", BRAND_KIT_SLOGAN === footerSlogan, footerSlogan);
  const nav = (["tr", "en", "de", "ar", "ru"] as const).every((l) => !!MESSAGES[l]["brandkit.nav"]);
  check("K7", "Nav label exists in all 5 languages", nav);
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return res;
}

async function httpTests() {
  const page = await get("/marka-kiti");
  const html = await page.text();
  check("P1", "/marka-kiti is public (200, no login redirect)", page.status === 200, `status ${page.status}`);
  check("P2", "Title and heading", /<title>[^<]*AlsatPort Marka Kiti/.test(html) && html.includes("AlsatPort Marka Kiti</h1>"));
  check("P3", "Meta description", /<meta name="description" content="AlsatPort’un resmi logo/.test(html));
  check("P4", "Canonical points to /marka-kiti", /<link rel="canonical" href="https:\/\/[^"]+\/marka-kiti"/.test(html));
  check("P5", "robots index, follow", /<meta name="robots" content="index, follow"/.test(html) && !/noindex/.test(page.headers.get("x-robots-tag") ?? ""));
  check("P6", "Usage rules and brand info present", html.includes("Logo kullanım kuralları") && html.includes("alsatport.com") && html.includes(BRAND_KIT_SLOGAN));
  check("P7", "Footer links to /marka-kiti", /href="\/marka-kiti"/.test(html));

  for (const f of files) {
    const linked = html.includes(`href="${f.src}"`) && html.includes(`download="${f.download}"`);
    const res = await get(f.src);
    const type = res.headers.get("content-type") ?? "";
    const expected = f.type === "PNG" ? "image/png" : f.type === "JPG" ? "image/jpeg" : "image/";
    const len = Number(res.headers.get("content-length") ?? (await res.arrayBuffer()).byteLength);
    check("D", `${f.download} ← ${f.src}`, linked && res.status === 200 && type.startsWith(expected) && len > 0, `${res.status} ${type}`);
  }

  const sitemap = await (await get("/sitemap.xml")).text();
  check("S1", "Sitemap lists /marka-kiti", /\/marka-kiti<\/loc>/.test(sitemap));
}

async function main() {
  unitTests();
  await httpTests();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
