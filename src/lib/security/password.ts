import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { isStrongPassword } from "@/lib/security/passwordPolicy";

const ROUNDS = 12;

export function assertStrongPassword(password: string) {
  if (!isStrongPassword(password)) {
    return false;
  }
  return true;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPasswordHash(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

let dummyHash: Promise<string> | null = null;

/**
 * Same bcrypt cost whether or not the account exists, so response time does not reveal
 * registered e-mails/usernames. Returns false when there is no real hash.
 */
export async function verifyPasswordOrDummy(password: string, passwordHash: string | undefined | null) {
  if (passwordHash) return bcrypt.compare(password, passwordHash);
  dummyHash ??= bcrypt.hash(randomBytes(24).toString("base64url"), ROUNDS);
  await bcrypt.compare(password, await dummyHash);
  return false;
}
