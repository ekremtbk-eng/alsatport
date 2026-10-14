"use client";

/**
 * Gets a listing photo into a shape /api/uploads accepts (JPEG, PNG or WebP, at most 6 MB) without changing
 * those server rules:
 * - iPhone HEIC/HEIF: iOS already hands JPEG to a file input whose `accept` omits HEIC. A HEIC that still
 *   arrives (desktop drag-drop, some Android pickers) is decoded by the browser and re-encoded as JPEG; when
 *   the browser cannot decode it the user gets a clear message instead of a failed upload.
 * - Phone photos over the size limit are scaled down and re-encoded as JPEG instead of being rejected.
 * Re-encoding goes through a canvas, so EXIF (including GPS) is dropped; orientation is applied first.
 */
export const UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** For the file input: iOS converts HEIC to JPEG because HEIC is not listed. */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";

const MAX_EDGE = 2560;

export type PrepError = "type" | "heic" | "size";

export function isHeicFile(file: File) {
  return /^image\/(heic|heif)(-sequence)?$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function directType(file: File) {
  if ((UPLOAD_TYPES as readonly string[]).includes(file.type)) return true;
  return !file.type && /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function looksLikeImage(file: File) {
  return directType(file) || isHeicFile(file) || file.type.startsWith("image/");
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
    } catch {
      /* Safari decodes HEIC through <img> but not always through createImageBitmap */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty");
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function reencode(file: File): Promise<Blob | null> {
  const img = await decode(file);
  if (!img) return null;
  try {
    for (const edge of [MAX_EDGE, 2048, 1600]) {
      const scale = Math.min(1, edge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      for (const q of [0.86, 0.76]) {
        const blob = await toBlob(canvas, q);
        if (blob && blob.size <= UPLOAD_MAX_BYTES) return blob;
      }
    }
    return null;
  } finally {
    img.done();
  }
}

export async function prepareListingPhoto(file: File): Promise<{ file: File } | { error: PrepError }> {
  const heic = isHeicFile(file);
  if (!heic && !directType(file)) return { error: "type" };
  if (!heic && file.size <= UPLOAD_MAX_BYTES) return { file };
  const blob = await reencode(file);
  if (!blob) return { error: heic ? "heic" : "size" };
  const name = `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;
  return { file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }) };
}
