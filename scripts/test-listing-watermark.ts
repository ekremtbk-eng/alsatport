import sharp from "sharp";
import { applyListingWatermark, LISTING_WATERMARK_MARK } from "../src/lib/storage/listingWatermark";

async function fixture(width: number, height: number, mime: "image/jpeg" | "image/png") {
  const buf = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 32, g: 64, b: 96 },
    },
  })
    [mime === "image/png" ? "png" : "jpeg"]({ quality: 95 })
    .toBuffer();
  return buf;
}

async function main() {
  const jpeg = await fixture(960, 540, "image/jpeg");
  const once = await applyListingWatermark(jpeg, "image/jpeg");
  const meta = await sharp(once.bytes).metadata();
  if (meta.width !== 960 || meta.height !== 540) {
    throw new Error(`aspect changed: ${meta.width}x${meta.height}`);
  }
  if (!once.bytes.includes(Buffer.from(LISTING_WATERMARK_MARK, "utf8"))) {
    throw new Error("watermark marker missing after first pass");
  }
  // A second pass re-encodes (metadata is always rebuilt) but must not stack another overlay.
  const twice = await applyListingWatermark(once.bytes, "image/jpeg");
  const [p1, p2] = await Promise.all([sharp(once.bytes).stats(), sharp(twice.bytes).stats()]);
  const drift = Math.max(...p1.channels.map((c, i) => Math.abs(c.mean - p2.channels[i].mean)));
  if (drift > 1.5) throw new Error(`second pass stacked another watermark (mean drift ${drift.toFixed(2)})`);
  if (!twice.bytes.includes(Buffer.from(LISTING_WATERMARK_MARK, "utf8"))) {
    throw new Error("watermark marker lost on second pass");
  }

  const located = await sharp(jpeg)
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD0: { Make: "LeakCam", Model: "SerialX-12345" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 0/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "29/1 0/1 0/1" },
    })
    .jpeg()
    .toBuffer();
  const inMeta = await sharp(located).metadata();
  if (!inMeta.exif?.includes(Buffer.from("LeakCam")) || inMeta.orientation !== 6) {
    throw new Error("fixture EXIF/orientation was not written");
  }
  const cleaned = await applyListingWatermark(located, "image/jpeg");
  const outMeta = await sharp(cleaned.bytes).metadata();
  const exif = outMeta.exif ?? Buffer.alloc(0);
  if (exif.includes(Buffer.from("LeakCam")) || exif.includes(Buffer.from("SerialX")) || cleaned.bytes.includes(Buffer.from("GPS"))) {
    throw new Error("camera/GPS EXIF survived re-encoding");
  }
  if (outMeta.orientation && outMeta.orientation !== 1) throw new Error("orientation tag kept instead of applied");
  if (outMeta.width !== 540 || outMeta.height !== 960) {
    throw new Error(`EXIF orientation not applied to pixels: ${outMeta.width}x${outMeta.height}`);
  }
  const png = await fixture(400, 700, "image/png");
  const markedPng = await applyListingWatermark(png, "image/png");
  const pngMeta = await sharp(markedPng.bytes).metadata();
  if (pngMeta.width !== 400 || pngMeta.height !== 700) {
    throw new Error(`png aspect changed: ${pngMeta.width}x${pngMeta.height}`);
  }
  console.log("listing watermark tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
