import sharp from "sharp";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const logoPath = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "d-AlsatPort",
  "assets",
  "c__Users_Mavi_AppData_Roaming_Cursor_User_workspaceStorage_942fb97bbad184bb7fd7c95a8cb0b66c_images_alsatport_logo-b5e1a351-7b15-4142-bfc4-644f1abf7f4c.jpg",
);

async function resolveLogo() {
  await readFile(logoPath);
  return logoPath;
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

async function pngSize(input, size, dest, radius = 0) {
  let pipeline = sharp(input).resize(size, size, { fit: "cover", position: "centre" });
  if (radius > 0) {
    const r = Math.round(size * radius);
    const svg = `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`;
    pipeline = pipeline.composite([{ input: Buffer.from(svg), blend: "dest-in" }]);
  }
  await pipeline.png().toFile(dest);
}

async function main() {
  const logo = await resolveLogo();
  const pub = path.join(root, "public");
  await mkdir(pub, { recursive: true });
  await copyFile(logo, path.join(pub, "brand-logo.jpg"));

  await pngSize(logo, 32, path.join(pub, "favicon-32x32.png"));
  await pngSize(logo, 48, path.join(pub, "favicon-48x48.png"));
  await pngSize(logo, 180, path.join(pub, "apple-icon.png"), 0.18);
  await pngSize(logo, 180, path.join(pub, "apple-touch-icon.png"), 0.18);
  await pngSize(logo, 192, path.join(pub, "icon.png"), 0.18);
  await pngSize(logo, 512, path.join(pub, "icon-512.png"), 0.18);

  const png32 = await sharp(logo).resize(32, 32, { fit: "cover" }).png().toBuffer();
  await writeFile(path.join(pub, "favicon.ico"), icoFromPng(png32));

  const mark = await sharp(logo).resize(420, 420, { fit: "cover" }).png().toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 11, g: 92, b: 46 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#0b5c2e"/>
                <stop offset="1" stop-color="#00c853"/>
              </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#g)"/>
            <rect x="48" y="48" width="1104" height="534" rx="36" fill="#ffffff"/>
          </svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: mark, top: 105, left: 390 },
    ])
    .png()
    .toFile(path.join(pub, "og.png"));

  console.log("Brand assets written to public/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
