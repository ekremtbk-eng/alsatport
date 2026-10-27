/**
 * Loopback register E2E server — same isolation as local-test-server.mjs, plus
 * Google's published reCAPTCHA *test* secret (always-pass siteverify). Captcha
 * code path still runs; production keys are never used.
 *
 *   LOCAL_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     node scripts/local-register-e2e-server.mjs [port]
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const port = process.argv[2] ?? "3014";
const db = process.env.LOCAL_TEST_DATABASE_URL ?? "";
const url = (() => {
  try {
    return new URL(db);
  } catch {
    return null;
  }
})();
if (!url || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || url.port !== "55433") {
  console.error("Refusing to start: LOCAL_TEST_DATABASE_URL must be the loopback test Postgres on port 55433.");
  process.exit(1);
}

const KEEP = [
  "PATH",
  "Path",
  "PATHEXT",
  "SystemRoot",
  "SYSTEMROOT",
  "windir",
  "ComSpec",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "APPDATA",
  "LOCALAPPDATA",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PROCESSOR_ARCHITECTURE",
];
const env = Object.fromEntries(KEEP.filter((k) => process.env[k] != null).map((k) => [k, process.env[k]]));
const secretDir = path.join(tmpdir(), "ap-reset");
const secretFile = path.join(secretDir, "sectest-secret.txt");
const secret = randomBytes(48).toString("base64");
mkdirSync(secretDir, { recursive: true });
writeFileSync(secretFile, secret);

Object.assign(env, {
  __NEXT_PROCESSED_ENV: "true",
  NODE_ENV: "production",
  MEDIA_STORAGE: "local",
  DATABASE_URL: db,
  AUTH_SECRET: secret,
  APP_URL: `http://127.0.0.1:${port}`,
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
  GOOGLE_CLIENT_ID: "123456789012-localdummy.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "local-dummy-not-a-secret",
  // Secret present so the captcha gate still runs; loopback stub satisfies siteverify
  // without calling Google (RECAPTCHA_E2E_STUB + ALSATPORT_LOOPBACK_TEST, never on Vercel).
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
  RECAPTCHA_SECRET_KEY: "6LeIxAcTAAAAAGG-vFI1TnRWxMZYLuLArCTIdDc3",
  ALSATPORT_LOOPBACK_TEST: "1",
  RECAPTCHA_E2E_STUB: "1",
  COOKIE_SECURE: "0",
});

const leaked = Object.keys(env).filter((k) => /BLOB|VERCEL/i.test(k));
if (leaked.length) {
  console.error(`Refusing to start: storage/Vercel variables present (${leaked.join(", ")}).`);
  process.exit(1);
}
console.log(
  `register e2e server: port ${port}, db=loopback:55433, recaptcha=google-test-keys, .env skipped`,
);

const cleanup = () => rmSync(secretFile, { force: true });
const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "-p", port, "-H", "127.0.0.1"], {
  env,
  stdio: "inherit",
});
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, () => {
    child.kill();
    cleanup();
    process.exit(0);
  });
}
child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
