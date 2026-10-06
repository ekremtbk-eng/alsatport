import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@/lib/security/rbac";
import { authSecretBytes } from "@/lib/security/secret";

type TokenInput = {
  sub: string;
  id: string;
  sid: string;
  role: Role;
  email: string;
  username: string;
  pc: 0 | 1;
  ev: 0 | 1;
};

export type AccessClaims = {
  sub: string;
  id?: string;
  sid?: string;
  role: Role;
  email: string;
  username: string;
  pc: 0 | 1;
  ev?: 0 | 1;
  typ: "access" | "refresh";
} & JWTPayload;

function secretKey() {
  return authSecretBytes();
}

export const ACCESS_TTL = "15m";
export const ACCESS_MAX_AGE = 60 * 15;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;
/** Admin sessions are short-lived regardless of activity. */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

export async function signAccessToken(input: TokenInput) {
  return new SignJWT({ ...input, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setSubject(input.sub)
    .sign(secretKey());
}

export async function signRefreshToken(input: TokenInput, maxAgeSeconds = REFRESH_MAX_AGE) {
  return new SignJWT({ ...input, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.max(60, Math.floor(maxAgeSeconds))}s`)
    .setSubject(input.sub)
    .sign(secretKey());
}

export async function verifyAuthToken(token: string, typ: "access" | "refresh"): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.typ !== typ || !payload.sub) return null;
    const role = payload.role;
    if (role !== "member" && role !== "seller" && role !== "admin") return null;
    return payload as AccessClaims;
  } catch {
    return null;
  }
}
