/**
 * Starts the built app for local tests with a closed environment:
 * - only OS basics are inherited, nothing else from the shell or user profile;
 * - __NEXT_PROCESSED_ENV=true makes Next.js skip every .env* file (including .env.production.local);
 * - MEDIA_STORAGE=local pins uploads to .data/uploads; the launcher refuses to start if any Blob variable exists;
 * - the database must be the loopback test Postgres on port 55433;
 * - AUTH_SECRET is random per run, shared with the test scripts through a temp file that is removed on exit;
 * - COOKIE_SECURE=0 + ALSATPORT_LOOPBACK_TEST=1 allow HTTP cookies on 127.0.0.1 for Chromium E2E
 *   (never set these on Vercel — cookieSecure() refuses them when VERCEL* is present).
 *
 * HTTPS option: a self-signed cert would also work, but Chromium automation would need the CA trusted
 * on every machine; the isolated COOKIE_SECURE=0 escape hatch is the supported local-test path.
 *
 *   LOCAL_TEST_DATABASE_URL=postgresql://...@127.0.0.1:55433/alsat node scripts/local-test-server.mjs [port]
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
  GOOGLE_CLIENT_ID: "123456789012-localdummy.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "local-dummy-not-a-secret",
  // Isolated loopback browser E2E only — see cookieSecure() guards.
  ALSATPORT_LOOPBACK_TEST: "1",
  COOKIE_SECURE: "0",
});

const leaked = Object.keys(env).filter((k) => /BLOB|VERCEL/i.test(k));
if (leaked.length) {
  console.error(`Refusing to start: storage/Vercel variables present (${leaked.join(", ")}).`);
  process.exit(1);
}
console.log(
  `local test server: port ${port}, storage=local (.data/uploads), cookies=http-ok (loopback), .env files=skipped, inherited keys=${Object.keys(env).length}`,
);

const cleanup = () => rmSync(secretFile, { force: true });
const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "-p", port, "-H", "127.0.0.1"], { env, stdio: "inherit" });
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
