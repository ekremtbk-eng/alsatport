import { NextResponse } from "next/server";
import { moderateAvatarImage, normalizeAvatar } from "@/lib/moderation/image";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { attachSession, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { saveUser } from "@/lib/security/userStore";
import {
  MAX_AVATAR_BYTES,
  deleteStoredObject,
  putAvatarImage,
  sniffImage,
  storageKeyFromUrl,
} from "@/lib/storage/media";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `avatar:${auth.user.id}`, limit: LIMITS.avatar.limit, windowMs: LIMITS.avatar.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ ok: false, error: "photo.avatar.mb" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniff = sniffImage(buf);
  if (!sniff) {
    return NextResponse.json({ ok: false, error: "photo.only" }, { status: 400 });
  }

  const flagged = await moderateAvatarImage(buf, file.name);
  if (flagged.blocked) {
    return NextResponse.json({ ok: false, error: flagged.reason }, { status: 400 });
  }

  const normalized = await normalizeAvatar(buf);
  const stored = await putAvatarImage(auth.user.id, normalized);
  const previous = auth.user.profile.avatar;
  const user = await saveUser({
    ...auth.user,
    profile: { ...auth.user.profile, avatar: stored.url },
  });
  const oldKey = previous ? storageKeyFromUrl(previous) : "";
  if (oldKey.startsWith(`avatars/${auth.user.id}/`)) {
    await deleteStoredObject(oldKey, previous);
  }

  const res = NextResponse.json({ ok: true, url: stored.url, user: user.profile });
  return attachSession(res, user);
}
