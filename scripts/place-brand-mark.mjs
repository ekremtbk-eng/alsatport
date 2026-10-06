import sharp from "sharp";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const src = path.join(process.cwd(), "public", "assets", "alsatport-logo.jpg");
const pub = path.join(process.cwd(), "public");
await mkdir(path.join(pub, "assets"), { recursive: true });

async function circlePng(size, dest) {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
  );
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .composite([{ input: circle, blend: "dest-in" }])
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

function icoFromPng(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

await circlePng(512, path.join(pub, "assets", "alsatport-mark.png"));
await circlePng(192, path.join(pub, "icon.png"));
await circlePng(512, path.join(pub, "icon-512.png"));
await circlePng(180, path.join(pub, "apple-icon.png"));
await circlePng(180, path.join(pub, "apple-touch-icon.png"));
await circlePng(32, path.join(pub, "favicon-32x32.png"));
await circlePng(48, path.join(pub, "favicon-48x48.png"));
const png32 = await sharp(path.join(pub, "favicon-32x32.png")).ensureAlpha().png().toBuffer();
const ico = icoFromPng(png32);
await writeFile(path.join(pub, "favicon.ico"), ico);
await copyFile(src, path.join(pub, "brand-logo.jpg"));
console.log("brand marks updated");
