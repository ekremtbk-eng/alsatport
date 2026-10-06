import { NextResponse } from "next/server";
import { moderateListingMaterial } from "@/lib/liveAnimalPolicy";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { applyListingWatermark } from "@/lib/storage/listingWatermark";
import {
  MAX_UPLOAD_BYTES,
  deleteStoredObject,
  isManagedStorageKey,
  putListingImage,
  sniffImage,
} from "@/lib/storage/media";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`upload:${ip}:${auth.user.id}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const categoryId = typeof form?.get("categoryId") === "string" ? String(form.get("categoryId")) : "";
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const banned = moderateListingMaterial(file, categoryId);
  if (banned.blocked) {
    return NextResponse.json({ ok: false, error: banned.reason ?? "mod.animal" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "photo.mb" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniff = sniffImage(buf);
  if (!sniff) {
    return NextResponse.json({ ok: false, error: "photo.only" }, { status: 400 });
  }

  let processed: Awaited<ReturnType<typeof applyListingWatermark>>;
  try {
    processed = await applyListingWatermark(buf, sniff.mime);
  } catch {
    return NextResponse.json({ ok: false, error: "photo.only" }, { status: 400 });
  }
  const stored = await putListingImage(auth.user.id, Buffer.from(processed.bytes), processed.mime, processed.ext);
  return NextResponse.json({ ok: true, ...stored });
}

export async function DELETE(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!isManagedStorageKey(key) || !key.startsWith(`listings/${auth.user.id}/`)) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }
  await deleteStoredObject(key);
  return NextResponse.json({ ok: true });
}
