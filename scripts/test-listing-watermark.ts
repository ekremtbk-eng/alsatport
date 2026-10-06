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
  const twice = await applyListingWatermark(once.bytes, "image/jpeg");
  if (twice.bytes.length !== once.bytes.length) {
    throw new Error("second pass rewrote an already watermarked file");
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
