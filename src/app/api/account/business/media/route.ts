import { NextResponse } from "next/server";
import { moderateAvatarImage, normalizeBusinessCover, normalizeBusinessLogo } from "@/lib/moderation/image";
import { LIMITS } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { throttle, tooMany } from "@/lib/security/throttle";
import { MAX_AVATAR_BYTES, MAX_UPLOAD_BYTES, putBusinessImage, sniffImage } from "@/lib/storage/media";

export const runtime = "nodejs";

/** Uploads a logo or cover; the URL only becomes part of the store once the owner saves the form. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle(
    [{ key: `business-media:${auth.user.id}`, limit: LIMITS.avatar.limit * 2, windowMs: LIMITS.avatar.windowMs }],
    req,
  );
  if (!limited.ok) return tooMany(limited.retryAfter);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "logo" && kind !== "cover")) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const max = kind === "logo" ? MAX_AVATAR_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > max) {
    return NextResponse.json({ ok: false, error: kind === "logo" ? "biz.err.logoSize" : "biz.err.coverSize" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(buf)) return NextResponse.json({ ok: false, error: "photo.only" }, { status: 400 });
  const flagged = await moderateAvatarImage(buf, file.name);
  if (flagged.blocked) return NextResponse.json({ ok: false, error: flagged.reason }, { status: 400 });

  const normalized = kind === "logo" ? await normalizeBusinessLogo(buf) : await normalizeBusinessCover(buf);
  const stored = await putBusinessImage(auth.user.id, kind, normalized);
  return NextResponse.json({ ok: true, url: stored.url });
}
