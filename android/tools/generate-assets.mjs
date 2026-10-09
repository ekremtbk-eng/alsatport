// Builds the Android launcher icons, splash image and Play Store graphics from the web logo in /public.
//   node android/tools/generate-assets.mjs        (run from the repository root)
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUB = path.join(ROOT, "public");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const PLAY = path.join(ROOT, "android", "play-store");

const SOURCE_ROUNDED = path.join(PUB, "icon-512.png");
const SOURCE_FULL = path.join(PUB, "icon-maskable-512.png");
const BRAND_DARK = "#0f4d28";

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function out(dir, file) {
  mkdirSync(dir, { recursive: true });
  return path.join(dir, file);
}

/** Circle (or feathered disc) alpha mask as SVG. */
function disc(size, solidRatio, edgeRatio = solidRatio) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
      `<stop offset="${solidRatio}" stop-color="#fff" stop-opacity="1"/><stop offset="${edgeRatio}" stop-color="#fff" stop-opacity="0"/>` +
      `</radialGradient></defs><circle cx="${r}" cy="${r}" r="${r}" fill="url(#g)"/></svg>`,
  );
}

async function legacyIcons() {
  for (const [dpi, k] of Object.entries(DENSITIES)) {
    const px = Math.round(48 * k);
    const dir = path.join(RES, `mipmap-${dpi}`);
    await sharp(SOURCE_ROUNDED).resize(px, px).png().toFile(out(dir, "ic_launcher.png"));
    const round = await sharp(SOURCE_FULL).resize(px, px).png().toBuffer();
    await sharp(round)
      .composite([{ input: disc(px, 0.995, 1), blend: "dest-in" }])
      .png()
      .toFile(out(dir, "ic_launcher_round.png"));
  }
}

/**
 * Adaptive icon foreground (108dp). Launchers show the centre 72dp; the maskable source keeps its logo in the
 * centre 80%, so it is scaled to 72/108 ÷ 0.8 ≈ 0.833 and its edge is faded into the solid background layer.
 */
async function adaptiveForeground() {
  for (const [dpi, k] of Object.entries(DENSITIES)) {
    const canvas = Math.round(108 * k);
    const inner = Math.round(canvas * 0.833);
    const logo = await sharp(SOURCE_FULL)
      .resize(inner, inner)
      .composite([{ input: disc(inner, 0.86, 1), blend: "dest-in" }])
      .png()
      .toBuffer();
    const pad = Math.floor((canvas - inner) / 2);
    await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: logo, left: pad, top: pad }])
      .png()
      .toFile(out(path.join(RES, `mipmap-${dpi}`), "ic_launcher_foreground.png"));
  }
}

/** Image shown by Chrome while the first page loads (128dp). */
async function splash() {
  for (const [dpi, k] of Object.entries(DENSITIES)) {
    const px = Math.round(128 * k);
    await sharp(SOURCE_ROUNDED).resize(px, px).png().toFile(out(path.join(RES, `drawable-${dpi}`), "splash.png"));
  }
}

async function playStore() {
  await sharp(SOURCE_FULL).resize(512, 512).png().toFile(out(PLAY, "icon-512.png"));
  const logo = await sharp(SOURCE_ROUNDED).resize(300, 300).png().toBuffer();
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">` +
      `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3d20"/><stop offset="1" stop-color="#14632f"/></linearGradient></defs>` +
      `<rect width="1024" height="500" fill="url(#b)"/>` +
      `<circle cx="850" cy="-40" r="260" fill="#00c853" fill-opacity="0.10"/>` +
      `<circle cx="980" cy="520" r="200" fill="#00c853" fill-opacity="0.08"/>` +
      `<text x="420" y="230" font-family="Segoe UI, Arial, sans-serif" font-size="78" font-weight="800" fill="#ffffff">AlsatPort</text>` +
      `<text x="422" y="292" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="600" fill="#b9f6ca">Al, Sat, Keşfet!</text>` +
      `<text x="422" y="344" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#e8f5e9">Ücretsiz ilan ver, fırsatları keşfet.</text>` +
      `</svg>`,
  );
  await sharp(bg)
    .composite([{ input: logo, left: 70, top: 100 }])
    .png()
    .toFile(out(PLAY, "feature-graphic-1024x500.png"));
}

await legacyIcons();
await adaptiveForeground();
await splash();
await playStore();
console.log(`Android assets written (adaptive background colour ${BRAND_DARK} is in res/values/colors.xml).`);
