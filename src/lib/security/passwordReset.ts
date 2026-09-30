import { SignJWT, jwtVerify } from "jose";
import { authSecretBytes } from "@/lib/security/secret";

export async function signPasswordResetToken(userId: string) {
  return new SignJWT({ typ: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(authSecretBytes());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecretBytes(), { algorithms: ["HS256"] });
    if (payload.typ !== "reset" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
