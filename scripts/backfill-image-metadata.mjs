#!/usr/bin/env node
/**
 * Report (default) or remove leftover EXIF/GPS/XMP/IPTC metadata from stored listing photos and
 * avatars, keeping every URL unchanged.
 *
 *   Dry run (read-only: DB SELECTs + HTTP GETs):
 *     node scripts/backfill-image-metadata.mjs
 *   Apply to a small batch (overwrites blobs in place, same pathname/URL, ETag-guarded):
 *     node scripts/backfill-image-metadata.mjs --apply --confirm=<blob-store-host> --limit=20 --backup-dir=<dir>
 *
 * Pixels are only rotated by their EXIF orientation and re-encoded in the original format; no new
 * watermark is drawn. The database is never written.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { head, put } from "@vercel/blob";
import sharp from "sharp";

const WATERMARK_MARK = "alsatport-wm-v1";
const WATERMARK_TEXT = "alsatport.com";
const LOCAL_ROOT = path.resolve(process.cwd(), ".data", "uploads");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const APPLY = args.apply === true;
const LIMIT = Number(args.limit ?? 20);
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";

const SENSITIVE_TAGS = new Map([
  [0x010f, "Make"],
  [0x0110, "Model"],
  [0x0131, "Software"],
  [0x0132, "DateTime"],
  [0x013b, "Artist"],
  [0x9003, "DateTimeOriginal"],
  [0x9004, "DateTimeDigitized"],
  [0xa430, "OwnerName"],
  [0xa431, "BodySerialNumber"],
  [0xa433, "LensMake"],
  [0xa434, "LensModel"],
  [0xa435, "LensSerialNumber"],
]);

/** Tag ids of IFD0 and the Exif sub-IFD, plus whether a GPS IFD exists. */
function exifTags(exif) {
  const tags = new Set();
  let gps = false;
  if (!exif || exif.length < 14) return { tags, gps };
  const tiff = exif.subarray(0, 6).toString("latin1") === "Exif\0\0" ? exif.subarray(6) : exif;
  const le = tiff.toString("latin1", 0, 2) === "II";
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const walk = (offset, depth) => {
    if (depth > 2 || offset + 2 > tiff.length) return;
    const count = u16(offset);
    for (let i = 0; i < count; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > tiff.length) return;
      const tag = u16(e);
      tags.add(tag);
      if (tag === 0x8825) gps = true;
      if (tag === 0x8769) walk(u32(e + 8), depth + 1);
    }
  };
  try {
    walk(u32(4), 0);
  } catch {
    /* truncated EXIF still counts as present */
  }
  return { tags, gps };
}

async function inspect(bytes) {
  const meta = await sharp(bytes, { failOn: "none" }).metadata();
  const { tags, gps } = exifTags(meta.exif);
  const sensitive = [...tags].filter((t) => SENSITIVE_TAGS.has(t)).map((t) => SENSITIVE_TAGS.get(t));
  const flags = {
    gps,
    device: sensitive.some((s) => /Make|Model|Serial|Lens|Owner|Artist|Software/.test(s)),
    date: sensitive.some((s) => s.startsWith("DateTime")),
    xmp: !!meta.xmp,
    iptc: !!meta.iptc,
    rotated: (meta.orientation ?? 1) > 1,
  };
  return { meta, flags, dirty: Object.values(flags).some(Boolean), sensitive };
}

async function strip(bytes, meta) {
  const marked = bytes.includes(Buffer.from(WATERMARK_MARK, "utf8"));
  let p = sharp(bytes, { failOn: "none" }).rotate();
  if (marked) p = p.withExif({ IFD0: { Copyright: WATERMARK_TEXT, ImageDescription: WATERMARK_MARK } });
  if (meta.format === "png") return { bytes: await p.png({ compressionLevel: 7 }).toBuffer(), mime: "image/png" };
  if (meta.format === "webp") return { bytes: await p.webp({ quality: 92 }).toBuffer(), mime: "image/webp" };
  if (meta.format === "jpeg") return { bytes: await p.jpeg({ quality: 93, mozjpeg: true }).toBuffer(), mime: "image/jpeg" };
  return null;
}

function localPath(url) {
  if (!url.startsWith("/api/media/")) return null;
  const parts = url.slice("/api/media/".length).split("/").filter(Boolean).map(decodeURIComponent);
  const abs = path.resolve(LOCAL_ROOT, ...parts);
  return abs.toLowerCase().startsWith(LOCAL_ROOT.toLowerCase()) ? abs : null;
}

const isBlob = (url) => /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(url);

async function load(url) {
  const local = localPath(url);
  if (local) return fs.readFile(local).catch(() => null);
  if (!isBlob(url)) return null;
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

async function save(row, out) {
  const local = localPath(row.url);
  if (local) return fs.writeFile(local, out.bytes);
  const pathname = new URL(row.url).pathname.replace(/^\//, "");
  const current = await head(row.url, { token: BLOB_TOKEN });
  await put(decodeURIComponent(pathname), out.bytes, {
    access: "public",
    token: BLOB_TOKEN,
    contentType: out.mime,
    addRandomSuffix: false,
    allowOverwrite: true,
    ifMatch: current.etag,
  });
}

const db = new PrismaClient();
const rows = [
  ...(await db.$queryRaw`SELECT 'listing' AS kind, id::text AS id, url, created_at FROM listing_images`),
  ...(await db.$queryRaw`SELECT 'avatar' AS kind, user_id::text AS id, avatar_url AS url, updated_at AS created_at
                         FROM profiles WHERE avatar_url IS NOT NULL AND avatar_url <> ''`),
];
await db.$disconnect();

const stores = new Set(rows.filter((r) => isBlob(r.url)).map((r) => new URL(r.url).hostname.split(".")[0]));
if (APPLY) {
  if (stores.size > 1 || (stores.size === 1 && args.confirm !== [...stores][0])) {
    console.error(`Refusing: pass --confirm=${[...stores].join("|") || "local"} to target this store.`);
    process.exit(2);
  }
  if (stores.size && !BLOB_TOKEN) {
    console.error("Refusing: BLOB_READ_WRITE_TOKEN is not set.");
    process.exit(2);
  }
  if (typeof args["backup-dir"] !== "string") {
    console.error("Refusing: --backup-dir=<local dir> is required with --apply (delete it after verifying).");
    process.exit(2);
  }
  await fs.mkdir(args["backup-dir"], { recursive: true });
}

const summary = { total: rows.length, managed: 0, skippedExternal: 0, unreadable: 0, clean: 0, dirty: 0, fixed: 0, failed: 0 };
const counts = { gps: 0, device: 0, date: 0, xmp: 0, iptc: 0, rotated: 0 };
const report = [];
let applied = 0;

for (const row of rows) {
  if (!localPath(row.url) && !isBlob(row.url)) {
    summary.skippedExternal++;
    continue;
  }
  summary.managed++;
  const bytes = await load(row.url);
  if (!bytes) {
    summary.unreadable++;
    report.push({ kind: row.kind, id: row.id, url: row.url, status: "unreadable" });
    continue;
  }
  const info = await inspect(bytes).catch(() => null);
  if (!info) {
    summary.unreadable++;
    continue;
  }
  if (!info.dirty) {
    summary.clean++;
    continue;
  }
  summary.dirty++;
  for (const [k, v] of Object.entries(info.flags)) if (v) counts[k]++;
  const entry = { kind: row.kind, id: row.id, url: row.url, createdAt: row.created_at, flags: info.flags, tags: info.sensitive, status: "dirty" };
  report.push(entry);

  if (!APPLY || applied >= LIMIT) continue;
  applied++;
  try {
    const out = await strip(bytes, info.meta);
    if (!out) throw new Error(`unsupported format ${info.meta.format}`);
    const check = await inspect(out.bytes);
    if (check.dirty) throw new Error("output still has metadata");
    await fs.writeFile(path.join(args["backup-dir"], `${row.kind}-${row.id}.${info.meta.format}`), bytes);
    await save(row, out);
    const after = await load(row.url);
    const verify = after && (await inspect(after));
    if (!verify || verify.dirty) throw new Error("verification failed after write");
    entry.status = "fixed";
    summary.fixed++;
  } catch (err) {
    entry.status = `failed: ${err instanceof Error ? err.message : String(err)}`;
    summary.failed++;
  }
}

const outFile = path.resolve(process.cwd(), ".data", `image-metadata-${APPLY ? "apply" : "dryrun"}-${Date.now()}.json`);
await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify({ mode: APPLY ? "apply" : "dry-run", stores: [...stores], summary, counts, report }, null, 2));
console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", stores: [...stores], summary, counts }, null, 2));
console.log(`Report: ${outFile}`);
