import "server-only";
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
