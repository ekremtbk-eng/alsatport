/**
 * Isolated register E2E (loopback Postgres :55433 only).
 * Covers phone unique → 400 (not 500), successful signup + profile/consent rows, then login.
 *
 *   E2E_BASE=http://127.0.0.1:3014 \
 *   E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *   npx tsx scripts/test-register-phone-e2e.ts
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { neighborhoodsOf } from "../src/lib/geo/neighborhoods";

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const BASE = (process.env.E2E_BASE ?? "").replace(/\/$/, "");
const DB = process.env.E2E_DATABASE_URL ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

function assertLoopbackDb() {
  let u: URL;
  try {
    u = new URL(DB);
  } catch {
    throw new Error("E2E_DATABASE_URL required");
  }
  if (!LOOPBACK.test(u.hostname) || u.port !== "55433") {
    throw new Error(`Refusing non-loopback:55433 (got ${u.hostname}:${u.port || "5432"})`);
  }
}

function synEmail(tag: string) {
  return `reg-phone-${tag}-${randomBytes(4).toString("hex")}@e2e.invalid`;
}

function synPhone(n: number) {
  // Valid TR mobile shape; last 7 digits vary.
  return `0532${String(1000000 + (n % 9000000)).padStart(7, "0")}`;
}

async function csrfJar() {
  const res = await fetch(`${BASE}/api/auth/csrf`, { method: "GET" });
  const json = (await res.json()) as { ok?: boolean; token?: string };
  const token = json.token ?? "";
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie = raw.map((c) => c.split(";")[0]).join("; ");
  return { token, cookie };
}

async function postRegister(
  jar: { token: string; cookie: string },
  body: Record<string, unknown>,
) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      referer: `${BASE}/kayit`,
      "x-csrf-token": jar.token,
      cookie: jar.cookie,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { ok?: boolean; error?: string; user?: { id?: string; phone?: string } } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* keep empty */
  }
  return { status: res.status, json, retryAfter: res.headers.get("retry-after") };
}

async function main() {
  if (!BASE) throw new Error("E2E_BASE required");
  assertLoopbackDb();
  process.env.DATABASE_URL = DB;

  const prisma = new PrismaClient();
  const hoods = neighborhoodsOf("Ankara", "Çankaya");
  if (!hoods.length) throw new Error("Ankara/Çankaya neighborhoods missing");
  const place = { city: "Ankara", district: "Çankaya", neighborhood: hoods[0]! };
  const password = "RegE2e1!Aa";
  // Google reCAPTCHA v3 test token placeholder — server must use Google's test secret
  // (always-pass). Token only needs length ≥ 20 for local gate.
  const captcha = `e2e-test-token-${randomBytes(16).toString("hex")}`;

  const phoneShared = synPhone(Date.now() % 9000000);
  const phoneUnique = synPhone((Date.now() + 17) % 9000000);

  try {
    const jar1 = await csrfJar();
    const first = await postRegister(jar1, {
      email: synEmail("a"),
      password,
      passwordConfirm: password,
      firstName: "E2e",
      lastName: "Alpha",
      username: `e2ea${randomBytes(2).toString("hex")}`,
      phone: phoneShared,
      ...place,
      termsAccepted: true,
      kvkkRead: true,
      marketingEmail: true,
      marketingSms: false,
      recaptchaToken: captcha,
    });
    check(
      "R1",
      "first register with fresh phone succeeds",
      first.status === 200 && first.json.ok === true && !!first.json.user?.id,
      `status=${first.status} err=${first.json.error ?? ""}`,
    );
    const userId = first.json.user?.id ?? "";

    if (userId) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      const consents = await prisma.marketingConsent.findMany({ where: { userId } });
      check(
        "R2",
        "profile place + consent timestamps written",
        !!profile &&
          profile.city === "Ankara" &&
          !!profile.district &&
          !!profile.neighborhood &&
          !!profile.termsAcceptedAt &&
          !!profile.kvkkNotifiedAt &&
          profile.marketingEmail === true,
        `city=${profile?.city ?? ""} consents=${consents.length}`,
      );
      check(
        "R3",
        "marketing_consents ledger has email (+ optional sms) rows",
        consents.some((c) => c.channel === "email" && c.granted === true) &&
          consents.some((c) => c.channel === "sms" && c.granted === false),
        `n=${consents.length}`,
      );
    } else {
      check("R2", "profile place + consent timestamps written", false, "no user");
      check("R3", "marketing_consents ledger has email (+ optional sms) rows", false, "no user");
    }

    const jar2 = await csrfJar();
    const dup = await postRegister(jar2, {
      email: synEmail("b"),
      password,
      passwordConfirm: password,
      firstName: "E2e",
      lastName: "Beta",
      username: `e2eb${randomBytes(2).toString("hex")}`,
      phone: phoneShared,
      ...place,
      termsAccepted: true,
      kvkkRead: true,
      marketingEmail: false,
      marketingSms: false,
      recaptchaToken: `e2e-test-token-${randomBytes(16).toString("hex")}`,
    });
    check(
      "R4",
      "duplicate phone returns 400 phoneTaken (not 500)",
      dup.status === 400 && dup.json.error === "auth.err.phoneTaken",
      `status=${dup.status} err=${dup.json.error ?? ""}`,
    );

    const emailC = synEmail("c");
    const userC = `e2ec${randomBytes(2).toString("hex")}`;
    const jar3 = await csrfJar();
    const second = await postRegister(jar3, {
      email: emailC,
      password,
      passwordConfirm: password,
      firstName: "E2e",
      lastName: "Gamma",
      username: userC,
      phone: phoneUnique,
      ...place,
      termsAccepted: true,
      kvkkRead: true,
      marketingEmail: false,
      marketingSms: true,
      recaptchaToken: `e2e-test-token-${randomBytes(16).toString("hex")}`,
    });
    check(
      "R5",
      "second register with new phone succeeds",
      second.status === 200 && second.json.ok === true,
      `status=${second.status} err=${second.json.error ?? ""}`,
    );

    // Login with identifier = email
    const loginCsrf = await csrfJar();
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: BASE,
        "x-csrf-token": loginCsrf.token,
        cookie: loginCsrf.cookie,
      },
      body: JSON.stringify({ identifier: emailC, password }),
    });
    const loginJson = (await login.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      user?: { id?: string; username?: string };
    };
    const loginCookies =
      typeof login.headers.getSetCookie === "function"
        ? login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
        : "";
    check(
      "R6",
      "login with new account succeeds",
      login.status === 200 && loginJson.ok === true,
      `status=${login.status} err=${loginJson.error ?? ""}`,
    );

    const session = await fetch(`${BASE}/api/auth/session`, {
      headers: { cookie: `${loginCookies}; ${loginCsrf.cookie}` },
    });
    const sessionJson = (await session.json().catch(() => ({}))) as {
      ok?: boolean;
      user?: { username?: string; phone?: string };
    };
    check(
      "R7",
      "session exposes profile for logged-in user",
      session.status === 200 &&
        sessionJson.ok === true &&
        sessionJson.user?.username === userC,
      `status=${session.status} user=${sessionJson.user?.username ?? ""}`,
    );
  } finally {
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
