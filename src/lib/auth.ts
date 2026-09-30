import type { UserProfile } from "@/data/store";

export type AuthProviderKind = "email" | "google" | "apple" | "facebook";

export type AuthAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash?: string;
  salt?: string;
  provider: AuthProviderKind;
  googleSub?: string;
  profile: UserProfile;
};

export type AuthResult =
  | { ok: true; needsProfile: boolean; needsEmailVerify?: boolean }
  | { ok: false; error: string };

export const SEED_OWNER_ID = "u-ekrem";
export const DEMO_ACCOUNT_ID = "acc-demo-ekrem";

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("tr");
}

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLocaleLowerCase("tr");
}

export function isSeedOwnerUser(user: UserProfile | null | undefined) {
  return !!user && user.id === SEED_OWNER_ID;
}

export function withoutDemoAccounts(accounts: AuthAccount[]) {
  return accounts.filter((a) => a.id !== DEMO_ACCOUNT_ID && a.profile?.id !== SEED_OWNER_ID);
}

export function isValidEmail(value: string) {
  const v = value.trim();
  if (v.length < 3 || v.length > 254 || /\s/.test(v)) return false;
  const at = v.indexOf("@");
  if (at < 1 || at !== v.lastIndexOf("@")) return false;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (!local || !domain) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^[^\s@]+$/.test(local) && /^[^\s@]+$/.test(domain);
}

export { isStrongPassword as isValidPassword } from "@/lib/security/passwordPolicy";

export function isGmail(value: string) {
  return /@(gmail|googlemail)\.com$/i.test(value.trim());
}

export function findAccount(accounts: AuthAccount[], identifier: string) {
  const id = identifier.trim();
  const email = normalizeEmail(id);
  const user = normalizeUsername(id);
  return accounts.find(
    (a) => normalizeEmail(a.email) === email || normalizeUsername(a.username) === user,
  );
}

export function parseGoogleJwt(credential: string): {
  email: string;
  name: string;
  picture?: string;
  sub: string;
} | null {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      ),
    ) as { email?: string; name?: string; picture?: string; sub?: string };
    if (!json.email || !json.sub) return null;
    return {
      email: json.email,
      name: json.name || json.email.split("@")[0],
      picture: json.picture,
      sub: json.sub,
    };
  } catch {
    return null;
  }
}
