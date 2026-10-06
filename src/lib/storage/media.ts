import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_LISTING_PHOTOS = 16;

const LOCAL_ROOT = path.resolve(process.cwd(), ".data", "uploads");

export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export function isManagedStorageKey(key: string) {
  return /^(listings|avatars)\//.test(key) && !key.includes("..") && !key.includes("\\");
}

export function storageKeyFromUrl(url: string) {
  if (url.startsWith("/api/media/")) {
    return url
      .slice("/api/media/".length)
      .split("/")
      .filter(Boolean)
      .map((p) => decodeURIComponent(p))
      .join("/");
  }
  try {
    const parsed = new URL(url);
    const ownHost = ownBlobHost();
    if (parsed.protocol === "https:" && ownHost && parsed.hostname.toLowerCase() === ownHost) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    /* ignore */
  }
  return `remote/${crypto.randomUUID()}`;
}

/**
 * Public host of *this* project's Blob store. Any other `*.blob.vercel-storage.com` host is someone
 * else's store and must never count as one of our managed (moderated, EXIF-stripped) uploads.
 */
function ownBlobHost() {
  const explicit = process.env.BLOB_PUBLIC_HOST?.trim().toLowerCase();
  if (explicit) return explicit;
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3]?.trim().toLowerCase();
  return storeId ? `${storeId}.public.blob.vercel-storage.com` : "";
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function putAvatarImage(userId: string, bytes: Buffer) {
  const storageKey = `avatars/${userId}/${crypto.randomUUID()}.webp`;
  const mime = "image/webp";
  if (blobEnabled()) {
    const blob = await put(storageKey, bytes, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
      addRandomSuffix: false,
    });
    return { storageKey, url: blob.url, mime, byteSize: bytes.length };
  }
  const abs = path.join(LOCAL_ROOT, ...storageKey.split("/"));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, bytes);
  const publicPath = storageKey.split("/").map(encodeURIComponent).join("/");
  return { storageKey, url: `/api/media/${publicPath}`, mime, byteSize: bytes.length };
}

export async function putListingImage(userId: string, bytes: Buffer, mime: string, ext: string) {
  const storageKey = `listings/${userId}/${crypto.randomUUID()}.${ext}`;
  if (blobEnabled()) {
    const blob = await put(storageKey, bytes, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
      addRandomSuffix: false,
    });
    return { storageKey, url: blob.url, mime, byteSize: bytes.length };
  }
  const abs = path.join(LOCAL_ROOT, ...storageKey.split("/"));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, bytes);
  const publicPath = storageKey.split("/").map(encodeURIComponent).join("/");
  return { storageKey, url: `/api/media/${publicPath}`, mime, byteSize: bytes.length };
}

export async function deleteStoredObject(storageKey: string, url?: string) {
  if (!isManagedStorageKey(storageKey)) return;
  if (blobEnabled()) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const target = url?.startsWith("https://") && storageKeyFromUrl(url) === storageKey ? url : storageKey;
    await del(target, { token }).catch(() => undefined);
    return;
  }
  const abs = path.resolve(LOCAL_ROOT, ...storageKey.split("/"));
  if (!abs.toLowerCase().startsWith(LOCAL_ROOT.toLowerCase())) return;
  await fs.unlink(abs).catch(() => undefined);
}

export async function readLocalObject(keyParts: string[]) {
  const storageKey = keyParts.join("/");
  if (!isManagedStorageKey(storageKey)) return null;
  const abs = path.resolve(LOCAL_ROOT, ...keyParts);
  if (!abs.toLowerCase().startsWith(LOCAL_ROOT.toLowerCase())) return null;
  const bytes = await fs.readFile(abs).catch(() => null);
  if (!bytes) return null;
  const sniff = sniffImage(bytes);
  return { bytes, mime: sniff?.mime ?? "application/octet-stream" };
}
