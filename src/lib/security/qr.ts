import "server-only";
import { prisma } from "@/lib/db";
import { sha256Secret } from "@/lib/security/hash";

export const COOKIE_QR_SECRET = "ap_qrs";
export const QR_LOGIN_TTL_MS = 2 * 60 * 1000;
export const QR_PHOTO_TTL_MS = 10 * 60 * 1000;

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export function qrHash(value: string) {
  return sha256Secret("qr", value);
}

/** Only hashes are stored: a leaked row cannot be turned back into a usable QR or session. */
export async function createLoginToken(userAgent: string) {
  const token = randomToken();
  const secret = randomToken();
  await prisma.qrToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });
  await prisma.qrToken.create({
    data: {
      kind: "login",
      tokenHash: await qrHash(token),
      secretHash: await qrHash(secret),
      requesterAgent: describeAgent(userAgent),
      expiresAt: new Date(Date.now() + QR_LOGIN_TTL_MS),
    },
  });
  return { token, secret };
}

export async function createPhotoToken(userId: string, listingId: string) {
  const token = randomToken();
  await prisma.qrToken.create({
    data: {
      kind: "photo",
      tokenHash: await qrHash(token),
      userId,
      listingId,
      expiresAt: new Date(Date.now() + QR_PHOTO_TTL_MS),
    },
  });
  return token;
}

export async function findLiveToken(token: string, kind: "login" | "photo") {
  const row = await prisma.qrToken.findUnique({ where: { tokenHash: await qrHash(token) } });
  if (!row || row.kind !== kind || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Coarse browser/OS label shown on the phone so the user can spot a QR they did not open. */
export function describeAgent(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Tarayıcı";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua) && !/Mobile/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}
