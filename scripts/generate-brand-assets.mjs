import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sheetPath = path.join(root, "scripts", "assets", "alsatport-brand-sheet.png");
const pub = path.join(root, "public");
const assets = path.join(pub, "assets");

const sheet = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = sheet.info.width;
const H = sheet.info.height;

function region(x0, y0, x1, y1, keep) {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      const si = (sy * W + sx) * 4;
      const di = (y * w + x) * 4;
      const r = sheet.data[si];
      const g = sheet.data[si + 1];
      const b = sheet.data[si + 2];
      let a = sheet.data[si + 3];
      a = keep(sx, sy, r, g, b, a);
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function trimmed(buf, pad = 0) {
  const t = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  if (!pad) return t;
  return sharp(t)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Bag + A/arrow symbol from the large header lockup, cut away from the wordmark's first "A". */
const symbol = await trimmed(
  await region(50, 25, 356, 290, (x, y, r, g, b, a) => {
    if (a < 10) return 0;
    const xmax = 350 - (y - 100) * 0.18;
    if (x >= xmax + 1) return 0;
    if (x >= xmax) return Math.round(a * (xmax + 1 - x));
    return a;
  }),
);

/** Small-use horizontal lockup (dark wordmark) for light surfaces; the white haze behind it is dropped. */
const logoLight = await trimmed(
  await region(625, 318, W, 452, (x, y, r, g, b, a) => {
    if (a < 60) return 0;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (a < 250 && sat < 40 && (r + g + b) / 3 > 140) return 0;
    return a;
  }),
  2,
);

/** Large header lockup (white wordmark) for dark surfaces, minus the size badge. */
const logoDark = await trimmed(
  await region(50, 25, 950, 293, (x, y, r, g, b, a) => {
    if (x >= 895 && y >= 255) return 0;
    if (a < 14) return 0;
    return a;
  }),
  2,
);

function tileSvg(size, radius) {
  const r = Math.round(size * radius);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#14532d"/>
          <stop offset="1" stop-color="#052e16"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.38" r="0.62">
          <stop offset="0" stop-color="#22c55e" stop-opacity="0.28"/>
          <stop offset="1" stop-color="#22c55e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#glow)"/>
    </svg>`,
  );
}

async function icon(size, { radius = 0.22, fill = 0.86, flat = false } = {}) {
  const inner = Math.round(size * fill);
  const mark = await sharp(symbol)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
    .png()
    .toBuffer();
  const off = Math.round((size - inner) / 2);
  const img = sharp(tileSvg(size, flat ? 0 : radius)).composite([{ input: mark, top: off, left: off }]);
  return img.png({ compressionLevel: 9 }).toBuffer();
}

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = [];
  let offset = 6 + entries.length * 16;
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.png)]);
}

await mkdir(assets, { recursive: true });

await sharp(logoLight).png({ compressionLevel: 9 }).toFile(path.join(assets, "alsatport-logo-light.png"));
await sharp(logoDark).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(path.join(assets, "alsatport-logo-dark.png"));

const small = { radius: 0.2, fill: 0.92 };
const png16 = await icon(16, small);
const png32 = await icon(32, small);
const png48 = await icon(48, small);
await writeFile(path.join(pub, "favicon-16x16.png"), png16);
await writeFile(path.join(pub, "favicon-32x32.png"), png32);
await writeFile(path.join(pub, "favicon-48x48.png"), png48);
const favicon = ico([
  { size: 16, png: png16 },
  { size: 32, png: png32 },
  { size: 48, png: png48 },
]);
// Icons live only in public/: an app/favicon.ico (or app/icon.png) next to the public copy
// makes Next.js answer 500 "conflicting public file and page file".
await writeFile(path.join(pub, "favicon.ico"), favicon);

const png192 = await icon(192);
const png512 = await icon(512);
await writeFile(path.join(pub, "icon.png"), png192);
await writeFile(path.join(pub, "icon-192.png"), png192);
await writeFile(path.join(pub, "icon-512.png"), png512);
await writeFile(path.join(assets, "alsatport-mark.png"), png512);

/** iOS applies its own corner mask, so the touch icon is a full-bleed square. */
const apple = await icon(180, { flat: true, fill: 0.84 });
await writeFile(path.join(pub, "apple-touch-icon.png"), apple);
await writeFile(path.join(pub, "apple-icon.png"), apple);

const maskable = await icon(512, { flat: true, fill: 0.7 });
await writeFile(path.join(pub, "icon-maskable-512.png"), maskable);

await sharp(await icon(512, { flat: true, fill: 0.86 }))
  .flatten({ background: "#ffffff" })
  .jpeg({ quality: 92 })
  .toFile(path.join(assets, "alsatport-logo.jpg"));

const svgMark = png192.toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 192 192" role="img" aria-label="AlSatPort"><image width="192" height="192" xlink:href="data:image/png;base64,${svgMark}"/></svg>\n`;
await writeFile(path.join(pub, "favicon.svg"), svg);
await writeFile(path.join(pub, "logo.svg"), svg);

async function og(dest) {
  const logo = await sharp(logoDark).resize({ width: 900 }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#052e16" } })
    .composite([
      {
        input: Buffer.from(
          `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#14532d"/>
                <stop offset="1" stop-color="#052e16"/>
              </linearGradient>
              <radialGradient id="h" cx="0.5" cy="0.45" r="0.6">
                <stop offset="0" stop-color="#22c55e" stop-opacity="0.22"/>
                <stop offset="1" stop-color="#22c55e" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#g)"/>
            <rect width="1200" height="630" fill="url(#h)"/>
          </svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: logo, top: Math.round((630 - meta.height) / 2), left: Math.round((1200 - meta.width) / 2) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

await og(path.join(pub, "og.png"));
await og(path.join(root, "src", "app", "opengraph-image.png"));
await og(path.join(root, "src", "app", "twitter-image.png"));

console.log("Brand assets written");
