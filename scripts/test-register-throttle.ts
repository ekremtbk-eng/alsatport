/**
 * Isolated checks for register rate-limit behaviour (no Production, no PII).
 * Avoids importing server-only modules; asserts route order and tooMany contract from source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

function main() {
  const root = process.cwd();
  const throttleSrc = readFileSync(join(root, "src/lib/security/throttle.ts"), "utf8");
  const routeSrc = readFileSync(join(root, "src/app/api/auth/register/route.ts"), "utf8");
  const messagesSrc = readFileSync(join(root, "src/i18n/messages.ts"), "utf8");

  check(
    "T1",
    "register throttle is 5 / hour",
    /register:\s*\{\s*limit:\s*5,\s*windowMs:\s*60\s*\*\s*60\s*\*\s*1000\s*\}/.test(throttleSrc),
  );

  check(
    "T2",
    "tooMany JSON includes retryAfter",
    /error:\s*"auth\.err\.rateLimit"/.test(throttleSrc) && /retryAfter:\s*wait/.test(throttleSrc),
  );

  check(
    "T3",
    "tooMany sets Retry-After header",
    /"Retry-After":\s*String\(wait\)/.test(throttleSrc),
  );

  const captchaAt = routeSrc.indexOf("verifyRecaptchaToken");
  const throttleAt = routeSrc.indexOf("THROTTLE.register");
  check(
    "T4",
    "register route runs captcha before register IP throttle",
    captchaAt > 0 && throttleAt > captchaAt,
    `captcha@${captchaAt} throttle@${throttleAt}`,
  );

  check(
    "T5",
    "register throttle key remains IP-scoped",
    routeSrc.includes("register:ip:${ip}"),
  );

  check(
    "T6",
    "rateLimitWait message exists for UX",
    messagesSrc.includes('"auth.err.rateLimitWait"') && messagesSrc.includes("{minutes}"),
  );

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main();
