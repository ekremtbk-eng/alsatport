import { randomBytes } from "node:crypto";

/** Domain reserved for tombstoned accounts — never a deliverable mailbox. */
export const ACCOUNT_TOMBSTONE_EMAIL_DOMAIN = "deleted.invalid";

/**
 * Opaque tombstone identifiers for deleted accounts.
 * Must not embed the real user UUID (re-identification risk).
 * Username length stays within DB check (2–40).
 */
export function createAccountTombstone(entropyBytes = 18): { email: string; username: string; token: string } {
  const token = randomBytes(entropyBytes).toString("base64url");
  const email = `deleted-${token}@${ACCOUNT_TOMBSTONE_EMAIL_DOMAIN}`;
  // "silinmis_" (9) + up to 20 from token → ≤ 29 chars
  const username = `silinmis_${token.slice(0, 20).toLowerCase()}`;
  return { email, username, token };
}

export function isTombstoneEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith(`@${ACCOUNT_TOMBSTONE_EMAIL_DOMAIN}`) && e.startsWith("deleted-");
}

/** True when the address embeds a UUID (legacy delete format — must not be reintroduced). */
export function emailEmbedsUuid(email: string): boolean {
  return /deleted-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/i.test(email);
}
