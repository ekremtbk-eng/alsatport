/**
 * Guards for originAllowed() loopback E2E alias.
 *   npx tsx scripts/test-loopback-origin.ts
 */
import { originAllowed } from "../src/lib/security/csrf";

const KEYS = ["NODE_ENV", "VERCEL", "VERCEL_ENV", "ALSATPORT_LOOPBACK_TEST"] as const;

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

function req(url: string, origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(url, { method: "POST", headers });
}

let failed = 0;
function check(
  name: string,
  patch: Partial<Record<(typeof KEYS)[number], string | undefined>>,
  url: string,
  origin: string | null,
  want: boolean,
) {
  withEnv(patch, () => {
    const got = originAllowed(req(url, origin));
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  — got=${got} want=${want}`);
  });
}

const prod = { NODE_ENV: "production" } as const;
const loop = { NODE_ENV: "production", ALSATPORT_LOOPBACK_TEST: "1" } as const;

check("no Origin always allowed", prod, "http://127.0.0.1:3014/api/auth/login", null, true);
check(
  "prod without loopback flag rejects mismatched 127 vs localhost",
  prod,
  "http://localhost:3014/api/auth/login",
  "http://127.0.0.1:3014",
  false,
);
check(
  "loopback test allows 127 Origin when req.url is localhost",
  loop,
  "http://localhost:3014/api/auth/login",
  "http://127.0.0.1:3014",
  true,
);
check(
  "loopback test allows localhost Origin when req.url is 127",
  loop,
  "http://127.0.0.1:3014/api/auth/login",
  "http://localhost:3014",
  true,
);
check(
  "VERCEL blocks loopback origin alias",
  { ...loop, VERCEL: "1" },
  "http://localhost:3014/api/auth/login",
  "http://127.0.0.1:3014",
  false,
);
check(
  "VERCEL_ENV=preview blocks loopback origin alias",
  { ...loop, VERCEL_ENV: "preview" },
  "http://localhost:3014/api/auth/login",
  "http://127.0.0.1:3014",
  false,
);
check(
  "VERCEL_ENV=development blocks loopback origin alias",
  { ...loop, VERCEL_ENV: "development" },
  "http://localhost:3014/api/auth/login",
  "http://127.0.0.1:3014",
  false,
);
check(
  "loopback alias rejects non-loopback Origin even with flag",
  loop,
  "http://localhost:3014/api/auth/login",
  "http://evil.example:3014",
  false,
);
check(
  "canonical production Origin still allowed",
  prod,
  "http://localhost:3014/api/auth/login",
  "https://alsatport.com",
  true,
);
check(
  "production CSRF origin check unchanged without loopback flag",
  prod,
  "https://alsatport.com/api/auth/login",
  "https://evil.example",
  false,
);

if (failed) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nALL LOOPBACK ORIGIN GUARDS PASSED");
