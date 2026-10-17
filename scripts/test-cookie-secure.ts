/**
 * Guards for cookieSecure(): Production/Preview must never get Secure disabled.
 *   npx tsx scripts/test-cookie-secure.ts
 */
import { cookieSecure } from "../src/lib/security/cookies";

const KEYS = ["NODE_ENV", "VERCEL", "VERCEL_ENV", "ALSATPORT_LOOPBACK_TEST", "COOKIE_SECURE"] as const;

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function withEnv(patch: Partial<Record<(typeof KEYS)[number], string | undefined>>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const k of KEYS) {
    prev[k] = process.env[k];
    if (k in patch) setEnv(k, patch[k]);
  }
  try {
    fn();
  } finally {
    for (const k of KEYS) setEnv(k, prev[k]);
  }
}

let failed = 0;
function check(name: string, patch: Partial<Record<(typeof KEYS)[number], string | undefined>>, want: boolean) {
  withEnv(patch, () => {
    const got = cookieSecure();
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  — got=${got} want=${want}`);
  });
}

check("local next start without flags stays secure when NODE_ENV=production", { NODE_ENV: "production" }, true);
check("dev mode is insecure cookies (expected for next dev)", { NODE_ENV: "development" }, false);
check(
  "loopback test + COOKIE_SECURE=0 disables secure",
  { NODE_ENV: "production", ALSATPORT_LOOPBACK_TEST: "1", COOKIE_SECURE: "0" },
  false,
);
check("COOKIE_SECURE=0 alone is ignored", { NODE_ENV: "production", COOKIE_SECURE: "0" }, true);
check("ALSATPORT_LOOPBACK_TEST alone keeps secure", { NODE_ENV: "production", ALSATPORT_LOOPBACK_TEST: "1" }, true);
check(
  "VERCEL blocks COOKIE_SECURE=0",
  { NODE_ENV: "production", VERCEL: "1", ALSATPORT_LOOPBACK_TEST: "1", COOKIE_SECURE: "0" },
  true,
);
check(
  "VERCEL_ENV=production blocks",
  { NODE_ENV: "production", VERCEL_ENV: "production", ALSATPORT_LOOPBACK_TEST: "1", COOKIE_SECURE: "0" },
  true,
);
check(
  "VERCEL_ENV=preview blocks",
  { NODE_ENV: "production", VERCEL_ENV: "preview", ALSATPORT_LOOPBACK_TEST: "1", COOKIE_SECURE: "0" },
  true,
);
check(
  "VERCEL_ENV=development blocks",
  { NODE_ENV: "production", VERCEL_ENV: "development", ALSATPORT_LOOPBACK_TEST: "1", COOKIE_SECURE: "0" },
  true,
);
check(
  "public HTTP production without loopback flags stays secure",
  { NODE_ENV: "production", COOKIE_SECURE: "0" },
  true,
);

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nALL COOKIE SECURE GUARDS PASSED");
