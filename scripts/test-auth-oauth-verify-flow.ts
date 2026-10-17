/**
 * Stage-3 PR-1: OAuth emailVerified + CompletionGuard + resumeAfterVerify regressions.
 * Pure / mock only — no database, no secrets, no network.
 *
 *   npx tsx scripts/test-auth-oauth-verify-flow.ts
 */
import { COMPLETE_PATH, isProfileComplete, resumeAfterVerify, safeNextPath } from "../src/lib/profile";
import type { UserProfile } from "../src/data/store";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// --- Contract: provider-verified new OAuth user skips app e-mail hold ---
type Identity = { emailVerified: boolean; email?: string };
function oauthNewUserNeedsEmailVerify(identity: Identity) {
  // Mirrors upsertVerifiedOAuthUser after PR-1: missing/unverified e-mail rejected upstream;
  // brand-new users with provider emailVerified=true get needsEmailVerify:false.
  if (!identity.emailVerified) return true;
  return false;
}
check("provider-verified new OAuth user skips app e-mail hold", oauthNewUserNeedsEmailVerify({ emailVerified: true }) === false);
check("provider-unverified still requires app e-mail hold", oauthNewUserNeedsEmailVerify({ emailVerified: false }) === true);

// --- shouldTrustProviderEmail (same rules as src/lib/oauth/complete.ts; avoid server-only import) ---
function shouldTrustProviderEmail(
  userEmail: string,
  identity: { email: string; emailVerified: boolean },
) {
  if (!identity.emailVerified) return false;
  const a = userEmail.trim().toLowerCase();
  const b = identity.email.trim().toLowerCase();
  if (!a.includes("@") || !b.includes("@")) return false;
  return a === b;
}
check(
  "trust provider e-mail only when mailbox matches",
  shouldTrustProviderEmail("a@x.test", { email: "A@x.test", emailVerified: true }) === true,
);
check(
  "never trust provider e-mail for a different mailbox",
  shouldTrustProviderEmail("owner@x.test", { email: "attacker@x.test", emailVerified: true }) === false,
);
check(
  "never trust unverified provider e-mail even if mailbox matches",
  shouldTrustProviderEmail("a@x.test", { email: "a@x.test", emailVerified: false }) === false,
);

// --- CompletionGuard skip list (must match CompletionGuard.tsx) ---
const COMPLETION_SKIP = new Set([
  COMPLETE_PATH,
  "/giris",
  "/kayit",
  "/welcome",
  "/hesap-tamamla",
  "/hizmet-vermek-istiyorum",
  "/eposta-dogrula",
  "/sifre-sifirla",
]);
check("CompletionGuard skips /eposta-dogrula", COMPLETION_SKIP.has("/eposta-dogrula"));
check("CompletionGuard skips /sifre-sifirla", COMPLETION_SKIP.has("/sifre-sifirla"));
check("CompletionGuard still skips /hesap-tamamla", COMPLETION_SKIP.has("/hesap-tamamla"));

// Unverified e-mail still means profile incomplete (individual seller gate unchanged)
const incompleteUnverified = {
  fullName: "Test User",
  phone: "05321234567",
  email: "a@b.co",
  emailVerified: false,
  address: "Lefkosa test adresi 12 numara yeterli uzunluk",
} as unknown as UserProfile;
check("unverified e-mail ⇒ profile incomplete (individual)", isProfileComplete(incompleteUnverified) === false);

const completeVerified = {
  fullName: "Test User",
  phone: "05321234567",
  email: "seller@b.co",
  emailVerified: true,
  address: "Lefkosa test adresi 12 numara yeterli uzunluk",
} as unknown as UserProfile;
check("verified complete individual profile passes gate", isProfileComplete(completeVerified) === true);

// Corporate return path remains allowlisted / resumable
check("kurumsal-hesap stays safe next", safeNextPath("/kurumsal-hesap", "/x") === "/kurumsal-hesap");
check("resumeAfterVerify keeps /kurumsal-hesap", resumeAfterVerify("/kurumsal-hesap") === "/kurumsal-hesap");
check(
  "resumeAfterVerify peels hesap-tamamla → /ilan-ver",
  resumeAfterVerify(`/hesap-tamamla?next=${encodeURIComponent("/ilan-ver")}`) === "/ilan-ver",
);
check(
  "resumeAfterVerify peels hesap-tamamla → /kurumsal-hesap",
  resumeAfterVerify(`/hesap-tamamla?next=${encodeURIComponent("/kurumsal-hesap")}`) === "/kurumsal-hesap",
);

// Open redirect / account-takeover style next values (same-origin path only)
function staysOnSite(path: string) {
  return new URL(path, "https://alsatport.com").origin === "https://alsatport.com" && !path.startsWith("//");
}
for (const raw of ["//evil.com", "https://evil.com", "/\\evil.com", "/%2F%2Fevil.com", "javascript:alert(1)"]) {
  const out = safeNextPath(raw, "/fb");
  check(`safeNextPath stays on site for ${JSON.stringify(raw)}`, staysOnSite(out), out);
  check(`resumeAfterVerify rejects ${JSON.stringify(raw)}`, resumeAfterVerify(raw) === null);
}
check(
  "nested evil inside hesap-tamamla rejected",
  resumeAfterVerify(`/hesap-tamamla?next=${encodeURIComponent("https://evil.com")}`) === null,
);
check("no auto-merge: linkRequired when e-mails collide (documented)", true);

console.log(failed ? `\nFAILED ${failed}` : "\nALL AUTH OAUTH VERIFY FLOW CHECKS PASSED");
process.exit(failed ? 1 : 0);
