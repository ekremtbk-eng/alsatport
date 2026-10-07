import "server-only";
import sharp from "sharp";

/** Avatars are tiny once normalised; this caps decode memory for decompression-bomb uploads. */
const SHARP_INPUT = { limitInputPixels: 60_000_000 } as const;

const EXPLICIT_NAME =
  /\b(nsfw|nude|nudes|naked|porn|xxx|sex|explicit|onlyfans|çıplak|ciplak|porno|seks)\b/i;

function isSkinPixel(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    Math.abs(r - g) > 15 &&
    y > 80 &&
    cr > 135 &&
    cr < 180 &&
    cb > 85 &&
    cb < 135
  );
}

async function heuristicNudity(bytes: Buffer) {
  const { data, info } = await sharp(bytes, SHARP_INPUT)
    .rotate()
    .resize(96, 96, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let skin = 0;
  let lowerSkin = 0;
  let lower = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const hit = isSkinPixel(data[i], data[i + 1], data[i + 2]);
      if (hit) skin++;
      if (y >= h / 2) {
        lower++;
        if (hit) lowerSkin++;
      }
    }
  }
  const ratio = skin / (w * h);
  const lowerRatio = lower ? lowerSkin / lower : 0;
  const blocked = ratio > 0.7 || (ratio > 0.5 && lowerRatio > 0.6);
  return { blocked, ratio, lowerRatio };
}

async function sightengineNudity(bytes: Buffer) {
  const user = process.env.SIGHTENGINE_API_USER?.trim();
  const secret = process.env.SIGHTENGINE_API_SECRET?.trim();
  if (!user || !secret) return null;
  // Only decoded pixels leave the server; EXIF/GPS from the original file is not forwarded.
  const clean = await sharp(bytes, SHARP_INPUT).rotate().jpeg({ quality: 85 }).toBuffer();
  const body = new FormData();
  body.set("media", new Blob([new Uint8Array(clean)]), "photo.jpg");
  body.set("models", "nudity-2.0");
  body.set("api_user", user);
  body.set("api_secret", secret);
  const res = await fetch("https://api.sightengine.com/1.0/check.json", { method: "POST", body });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    nudity?: {
      sexual_activity?: number;
      sexual_display?: number;
      erotica?: number;
      very_suggestive?: number;
    };
  } | null;
  const n = json?.nudity;
  if (!n) return null;
  const score = Math.max(n.sexual_activity ?? 0, n.sexual_display ?? 0, n.erotica ?? 0, n.very_suggestive ?? 0);
  return { blocked: score >= 0.45, score };
}

export async function moderateAvatarImage(bytes: Buffer, filename = "photo.jpg") {
  if (EXPLICIT_NAME.test(filename)) {
    return { blocked: true as const, reason: "photo.nsfw" as const };
  }
  try {
    const meta = await sharp(bytes, SHARP_INPUT).metadata();
    if (!meta.width || !meta.height || meta.width < 32 || meta.height < 32) {
      return { blocked: true as const, reason: "photo.only" as const };
    }
  } catch {
    return { blocked: true as const, reason: "photo.only" as const };
  }

  const remote = await sightengineNudity(bytes).catch(() => null);
  if (remote?.blocked) {
    return { blocked: true as const, reason: "photo.nsfw" as const };
  }

  const local = await heuristicNudity(bytes).catch(() => ({ blocked: false, ratio: 0, lowerRatio: 0 }));
  if (local.blocked) {
    return { blocked: true as const, reason: "photo.nsfw" as const };
  }
  return { blocked: false as const };
}

export async function normalizeBusinessLogo(bytes: Buffer) {
  return sharp(bytes, SHARP_INPUT)
    .rotate()
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 85 })
    .toBuffer();
}

export async function normalizeBusinessCover(bytes: Buffer) {
  return sharp(bytes, SHARP_INPUT)
    .rotate()
    .resize(1600, 500, { fit: "cover", position: "attention" })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function normalizeAvatar(bytes: Buffer) {
  return sharp(bytes, SHARP_INPUT)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();
}
