import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getAuthSecret } from "@/lib/security/secret";

const PREFIX = "v1:";

function piiKey() {
  const dedicated = process.env.ENCRYPTION_KEY?.trim() ?? "";
  const material = dedicated.length >= 32 ? dedicated : `${getAuthSecret()}:alsatport-pii-v1`;
  return createHash("sha256").update(material).digest();
}

/** AES-256-GCM for at-rest PII (profile address). Legacy plaintext is left readable until next save. */
export function encryptPii(plain: string) {
  const value = plain.trim();
  if (!value) return "";
  if (value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", piiKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptPii(stored: string | null | undefined) {
  const value = (stored ?? "").trim();
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", piiKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function isEncryptedPii(value: string | null | undefined) {
  return (value ?? "").startsWith(PREFIX);
}

export function maskIdentity(value: string) {
  const n = value.replace(/\D/g, "");
  if (n.length < 4) return n ? "••••" : "";
  return `${"•".repeat(Math.max(0, n.length - 2))}${n.slice(-2)}`;
}
