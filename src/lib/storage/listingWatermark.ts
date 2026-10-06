import sharp, { type Metadata } from "sharp";
import { LISTING_WATERMARK_PNG_BASE64 } from "@/lib/storage/listingWatermarkAsset";

export const LISTING_WATERMARK_TEXT = "alsatport.com";
export const LISTING_WATERMARK_MARK = "alsatport-wm-v1";

const watermarkBase = Buffer.from(LISTING_WATERMARK_PNG_BASE64, "base64");

function alreadyWatermarked(bytes: Buffer) {
  if (bytes.includes(Buffer.from(LISTING_WATERMARK_MARK, "utf8"))) return true;
  return bytes.includes(Buffer.from(LISTING_WATERMARK_MARK, "utf16le"));
}

function orientedSize(meta: Metadata) {
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const orientation = meta.orientation ?? 1;
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

function encodeOptions(mime: string) {
  if (mime === "image/png") return { mime, ext: "png" as const };
  if (mime === "image/webp") return { mime, ext: "webp" as const };
  return { mime: "image/jpeg", ext: "jpg" as const };
}

async function overlayFor(width: number, height: number) {
  const targetW = Math.max(96, Math.round(Math.min(width * 0.44, height * 2.2)));
  const resized = await sharp(watermarkBase)
    .resize({ width: targetW, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(resized.data);
  for (let i = 3; i < pixels.length; i += 4) {
    pixels[i] = Math.round(pixels[i] * 0.28);
  }
  return sharp(pixels, {
    raw: { width: resized.info.width, height: resized.info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Re-encodes an uploaded listing photo: applies EXIF orientation to the pixels, adds the
 * watermark and writes a fresh EXIF block that holds only the watermark marker. Input EXIF
 * (GPS, camera make/model, capture date, serial numbers), XMP, IPTC and ICC data are never
 * copied to the output. Throws if the image cannot be decoded, so callers must not fall back
 * to storing the original bytes.
 */
export async function applyListingWatermark(bytes: Buffer, mime: string) {
  const meta = await sharp(bytes, { failOn: "none" }).metadata();
  const size = orientedSize(meta);
  if (!size.width || !size.height) throw new Error("image-decode");

  let pipeline = sharp(bytes, { failOn: "none" }).rotate();
  if (!alreadyWatermarked(bytes)) {
    const overlay = await overlayFor(size.width, size.height);
    pipeline = pipeline.composite([{ input: overlay, gravity: "centre" }]);
  }
  pipeline = pipeline.withExif({
    IFD0: {
      Copyright: LISTING_WATERMARK_TEXT,
      ImageDescription: LISTING_WATERMARK_MARK,
    },
  });

  const encoded = encodeOptions(mime);
  if (encoded.mime === "image/png") {
    const out = await pipeline.png({ compressionLevel: 7 }).toBuffer();
    return { bytes: out, ...encoded };
  }
  if (encoded.mime === "image/webp") {
    const out = await pipeline.webp({ quality: 92 }).toBuffer();
    return { bytes: out, ...encoded };
  }
  const out = await pipeline.jpeg({ quality: 93, mozjpeg: true }).toBuffer();
  return { bytes: out, ...encoded };
}
