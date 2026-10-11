/**
 * Account-lookup and social-login linking regression suite (function level). Runs ONLY against a local database:
 *
 *   DATABASE_URL=<loopback> AUTH_SECRET=<32+ chars> npx tsx --conditions=react-server scripts/test-oauth-linking.ts
 *
 * Creates throw-away users (`*@oauthtest.invalid`) and removes them at the end. Run it from a checkout without
 * `.env*` files so no real provider, mail or database settings can be picked up.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
if (!LOOPBACK.test(dbHost)) throw new Error(`Refusing to run against non-local database host: ${dbHost || "(unset)"}`);
if ((process.env.AUTH_SECRET ?? "").length < 32) throw new Error("AUTH_SECRET (32+ chars, local only) is required.");

const TAG = randomBytes(4).toString("hex");
const DOMAIN = "oauthtest.invalid";
const VICTIM_PHONE = "05321234567";

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  - ${detail}` : ""}`);
}

async function main() {
  const { prisma } = await import("../src/lib/db");
  const store = await import("../src/lib/security/userStore");
  const oauth = await import("../src/lib/oauth/complete");
  const { signOAuthState, verifyOAuthState } = await import("../src/lib/oauth/providers");
  const { canLinkProvider } = await import("../src/lib/security/session");

  const hash = await bcrypt.hash(`Oauth!${TAG}9a`, 10);
  async function makeUser(label: string, opts: { phone?: string; verified?: boolean; role?: "seller" | "admin"; sub?: string } = {}) {
    const row = await prisma.user.create({
      data: {
        email: `${label}-${TAG}@${DOMAIN}`,
        username: `oauthtest_${label}_${TAG}`,
        role: opts.role ?? "seller",
        passwordHash: hash,
        provider: "email",
        providerSub: opts.sub ?? null,
        emailVerifiedAt: opts.verified === false ? null : new Date(),
        profile: { create: { displayName: `Test ${label}`, fullName: `Test ${label}`, phone: opts.phone ?? null, profileComplete: true } },
      },
    });
    return row;
  }
  const snapshot = (id: string) =>
    prisma.user.findUnique({ where: { id }, select: { email: true, providerSub: true, passwordHash: true, role: true } });
  const identity = (email: string, sub: string, verified = true) => ({
    provider: "google" as const,
    sub,
    email,
    emailVerified: verified,
    name: "Test Kisi",
  });
  const req = new Request("http://localhost/api/auth/oauth/google/callback", { headers: { "user-agent": "oauth-test" } });

  try {
    // ---------------- Lookup ----------------
    const victim = await makeUser("victim", { phone: VICTIM_PHONE });
    const digitsEmail = `a${VICTIM_PHONE.slice(1)}@attacker-${TAG}.${DOMAIN}`;

    check("L1", "Identifier: digits inside an e-mail never match a phone", !(await store.findUserByIdentifier(digitsEmail)));
    check("L2", "findUserByEmail: digits e-mail does not match the phone owner", !(await store.findUserByEmail(digitsEmail)));
    check("L3", "Identifier: exact e-mail matches", (await store.findUserByIdentifier(victim.email))?.id === victim.id);
    check("L4", "findUserByEmail: case-insensitive exact match", (await store.findUserByEmail(victim.email.toUpperCase()))?.id === victim.id);
    check("L5", "Identifier: username matches", (await store.findUserByIdentifier(victim.username))?.id === victim.id);
    check("L6", "Identifier: formatted phone still logs in", (await store.findUserByIdentifier("0532 123 45 67"))?.id === victim.id);
    check("L7", "Identifier: +90 phone still logs in", (await store.findUserByIdentifier("+90 532 123 4567"))?.id === victim.id);
    check("L8", "Identifier: text with digits is not treated as a phone", !(await store.findUserByIdentifier(`user${VICTIM_PHONE}x`)));
    const twin = await makeUser("twin", { phone: "05559998877" });
    await makeUser("twin2", { phone: "05559998877" });
    check("L9", "Identifier: a phone shared by two accounts matches none", !(await store.findUserByIdentifier("05559998877")), `twin=${twin.id.slice(0, 8)}`);
    check("L10", "findUserByUsername ignores e-mail-shaped input", !(await store.findUserByUsername(victim.email)));

    // ---------------- Social sign-in ----------------
    const before = await snapshot(victim.id);
    let attack: unknown;
    try {
      attack = await oauth.upsertVerifiedOAuthUser(identity(digitsEmail, `sub-attacker-${TAG}`), req);
    } catch (err) {
      // A brand-new account reaches the device-signal step, which needs a Next request scope; the DB state is what counts.
      attack = { thrown: err instanceof Error ? err.message.slice(0, 60) : "error" };
    }
    const after = await snapshot(victim.id);
    const attackerRow = await prisma.user.findFirst({ where: { providerSub: `sub-attacker-${TAG}` }, select: { id: true, email: true } });
    check(
      "O1",
      "Takeover blocked: phone-digits Google e-mail cannot enter the phone owner's account",
      JSON.stringify(before) === JSON.stringify(after) && after?.providerSub === null && attackerRow?.id !== victim.id && attackerRow?.email === digitsEmail,
      `victimUnchanged=${JSON.stringify(before) === JSON.stringify(after)} separate=${!!attackerRow && attackerRow.id !== victim.id}`,
    );
    void attack;

    const verified = await makeUser("verified");
    const vBefore = await snapshot(verified.id);
    const r2 = await oauth.upsertVerifiedOAuthUser(identity(verified.email, `sub-verified-${TAG}`), req);
    check(
      "O2",
      "Verified account with the same e-mail is not auto-linked (link required)",
      "linkRequired" in r2 && JSON.stringify(vBefore) === JSON.stringify(await snapshot(verified.id)),
      JSON.stringify(Object.keys(r2)),
    );

    const admin = await makeUser("admin", { role: "admin" });
    const aBefore = await snapshot(admin.id);
    const r3 = await oauth.upsertVerifiedOAuthUser(identity(admin.email, `sub-admin-${TAG}`), req);
    check("O3", "Admin account is never auto-linked", "linkRequired" in r3 && JSON.stringify(aBefore) === JSON.stringify(await snapshot(admin.id)));

    const linkedElsewhere = await makeUser("apple", { sub: `sub-apple-${TAG}` });
    const r4 = await oauth.upsertVerifiedOAuthUser(identity(linkedElsewhere.email, `sub-google-${TAG}`), req);
    const lAfter = await snapshot(linkedElsewhere.id);
    check(
      "O4",
      "Existing link is not silently replaced",
      "error" in r4 && r4.error === "auth.err.oauthLinked" && lAfter?.providerSub === `sub-apple-${TAG}`,
      "error" in r4 ? r4.error : "no error",
    );

    const returning = await makeUser("returning", { sub: `sub-returning-${TAG}` });
    const r5 = await oauth.upsertVerifiedOAuthUser(identity(`changed-${TAG}@${DOMAIN}`, `sub-returning-${TAG}`), req);
    const retAfter = await snapshot(returning.id);
    check(
      "O5",
      "Linked user signs in by provider id; account e-mail is not overwritten",
      "user" in r5 && r5.user.id === returning.id && retAfter?.email === returning.email,
      `email=${retAfter?.email === returning.email ? "kept" : "changed"}`,
    );

    const unverified = await makeUser("unverified", { verified: false });
    await prisma.userSession.create({
      data: { userId: unverified.id, method: "password", expiresAt: new Date(Date.now() + 3600_000), userAgent: "oauth-test" },
    });
    const r6 = await oauth.upsertVerifiedOAuthUser(identity(unverified.email, `sub-claim-${TAG}`), req);
    const uAfter = await prisma.user.findUnique({
      where: { id: unverified.id },
      select: { email: true, passwordHash: true, providerSub: true, emailVerifiedAt: true },
    });
    const openSessions = await prisma.userSession.count({ where: { userId: unverified.id, revokedAt: null } });
    check(
      "O6",
      "Unproven sign-up with the exact e-mail: password dropped, sessions revoked, e-mail unchanged",
      "user" in r6 && !uAfter?.passwordHash && uAfter?.providerSub === `sub-claim-${TAG}` && uAfter?.email === unverified.email && !!uAfter?.emailVerifiedAt && openSessions === 0,
      `pw=${!!uAfter?.passwordHash} sessions=${openSessions}`,
    );

    const r7 = await oauth.upsertVerifiedOAuthUser(identity(`noverify-${TAG}@${DOMAIN}`, `sub-nv-${TAG}`, false), req);
    check("O7", "Provider e-mail not verified: rejected", "error" in r7 && r7.error === "auth.err.email");

    // ---------------- Explicit linking ----------------
    const linker = await makeUser("linker");
    const l1 = await oauth.linkOAuthIdentity(linker.id, identity(`other-${TAG}@${DOMAIN}`, `sub-link-${TAG}`));
    const linkerAfter = await snapshot(linker.id);
    check(
      "K1",
      "Re-authenticated owner links Google; account e-mail and password unchanged",
      "user" in l1 && linkerAfter?.providerSub === `sub-link-${TAG}` && linkerAfter.email === linker.email && linkerAfter.passwordHash === hash,
    );
    const audit = await prisma.auditLog.findFirst({ where: { actorId: linker.id, action: "auth.oauth_linked" } });
    check("K2", "Link is written to the audit log", !!audit);
    const other = await makeUser("other");
    const l2 = await oauth.linkOAuthIdentity(other.id, identity(`x-${TAG}@${DOMAIN}`, `sub-link-${TAG}`));
    check("K3", "A provider id linked to someone else cannot be linked again", "error" in l2 && (await snapshot(other.id))?.providerSub === null);
    const l3 = await oauth.linkOAuthIdentity(linker.id, identity(`y-${TAG}@${DOMAIN}`, `sub-new-${TAG}`));
    check("K4", "An existing link is never replaced", "error" in l3 && (await snapshot(linker.id))?.providerSub === `sub-link-${TAG}`);

    // ---------------- Re-authentication gate ----------------
    const min = 60_000;
    const ago = (m: number) => new Date(Date.now() - m * min);
    check("R1", "Member: fresh sign-in may link", canLinkProvider({ createdAt: ago(2), stepUpAt: null, mfaAt: null }, "seller"));
    check("R2", "Member: 20-minute-old session may not link", !canLinkProvider({ createdAt: ago(20), stepUpAt: null, mfaAt: null }, "seller"));
    check("R3", "Admin: fresh session without second factor may not link", !canLinkProvider({ createdAt: ago(1), stepUpAt: null, mfaAt: null }, "admin"));
    check("R4", "Admin: stale second factor may not link", !canLinkProvider({ createdAt: ago(60), stepUpAt: null, mfaAt: ago(60) }, "admin"));
    check("R5", "Admin: fresh second factor may link", canLinkProvider({ createdAt: ago(60), stepUpAt: null, mfaAt: ago(3) }, "admin"));
    check("R6", "Admin: fresh step-up on a 2FA session may link", canLinkProvider({ createdAt: ago(90), stepUpAt: ago(2), mfaAt: ago(90) }, "admin"));

    // ---------------- State token ----------------
    const state = await signOAuthState({ provider: "google", next: "/profil?p=guvenlik", nonce: "n1", link: { uid: "u1", sid: "s1" } });
    const parsed = await verifyOAuthState(state, "google");
    check("S1", "Link intent survives the signed state", parsed?.link?.uid === "u1" && parsed.link.sid === "s1");
    const plain = await verifyOAuthState(await signOAuthState({ provider: "google", next: "/", nonce: "n2" }), "google");
    check("S2", "Normal sign-in state carries no link intent", !!plain && !plain.link);
    const [h, p, s] = state.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), link: { uid: "victim", sid: "s1" } })).toString("base64url");
    let forgedOk = true;
    try {
      await verifyOAuthState(`${h}.${forgedPayload}.${s}`, "google");
    } catch {
      forgedOk = false;
    }
    check("S3", "Tampered link intent is rejected", !forgedOk);
    check("S4", "State for another provider is rejected", (await verifyOAuthState(state, "apple")) === null);
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { contains: `${TAG}` , endsWith: DOMAIN } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const left = await prisma.user.count({ where: { email: { endsWith: DOMAIN } } });
    console.log(`\ncleanup: ${ids.length} test users removed, ${left} left`);
    await prisma.$disconnect();
  }

  const failed = results.filter((x) => !x.pass);
  console.log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
