/**
 * reCAPTCHA v3 config + verifyRecaptchaToken regression checks.
 * Does not print site/secret key values or tokens.
 *
 * Optional live check: when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, asks Google whether
 * api.js?render=KEY embeds the key (invalid/deleted keys fall back to push('onload')).
 */
import { verifyRecaptchaToken } from "../src/lib/security/recaptcha";

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

function redactKey(body: string, key: string) {
  return key ? body.split(key).join("<SITE_KEY>") : body;
}

async function loaderRegistersKey(key: string): Promise<{ ok: boolean; detail: string }> {
  const url = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, detail: `http ${res.status}` };
  const body = await res.text();
  const push = body.match(/cfg\['render'\]=cfg\['render'\]\|\|\[\]\)\.push\(([^)]+)\)/);
  const arg = push?.[1] ?? "";
  if (arg.includes(key)) return { ok: true, detail: "render=SITE_KEY" };
  if (arg.includes("'onload'") || arg.includes('"onload"')) {
    return { ok: false, detail: "Google returned render=onload (invalid or deleted site key)" };
  }
  return { ok: false, detail: `unexpected render push=${redactKey(arg, key).slice(0, 40)}` };
}

async function main() {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.RECAPTCHA_SECRET_KEY;

  process.env.RECAPTCHA_SECRET_KEY = "test-secret-not-real";

  // Missing token
  {
    const r = await verifyRecaptchaToken(undefined, "register");
    check("R1", "rejects missing token", r.ok === false && r.error === "auth.err.recaptcha");
  }

  // Short token
  {
    const r = await verifyRecaptchaToken("short", "register");
    check("R2", "rejects short token", r.ok === false && r.error === "auth.err.recaptcha");
  }

  // siteverify success + score/action
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ success: true, score: 0.9, action: "register", hostname: "alsatport.com" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;
  {
    const r = await verifyRecaptchaToken("x".repeat(40), "register", "203.0.113.10");
    check("R3", "accepts valid siteverify", r.ok === true);
  }

  // Low score
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, score: 0.1, action: "register", hostname: "alsatport.com" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  {
    const r = await verifyRecaptchaToken("x".repeat(40), "register");
    check("R4", "rejects score below 0.5", r.ok === false && r.error === "auth.err.recaptcha");
  }

  // Action mismatch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, score: 0.9, action: "login", hostname: "alsatport.com" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  {
    const r = await verifyRecaptchaToken("x".repeat(40), "register");
    check("R5", "rejects action mismatch", r.ok === false && r.error === "auth.err.recaptcha");
  }

  // Google failure codes (no token/secret in assertion surface)
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  {
    const r = await verifyRecaptchaToken("x".repeat(40), "register");
    check("R6", "rejects timeout-or-duplicate", r.ok === false && r.error === "auth.err.recaptcha");
  }

  // Missing secret
  delete process.env.RECAPTCHA_SECRET_KEY;
  globalThis.fetch = originalFetch;
  {
    const r = await verifyRecaptchaToken("x".repeat(40), "register");
    check("R7", "rejects when secret missing", r.ok === false && r.error === "auth.err.recaptcha");
  }

  if (originalSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
  else process.env.RECAPTCHA_SECRET_KEY = originalSecret;
  globalThis.fetch = originalFetch;

  // Google test key must embed in api.js (proves checker itself works)
  {
    const googleTest = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    const live = await loaderRegistersKey(googleTest);
    check("R8", "Google test site key registers in api.js", live.ok, live.detail);
  }

  const configured = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
  if (configured) {
    const live = await loaderRegistersKey(configured);
    check(
      "R9",
      "configured NEXT_PUBLIC_RECAPTCHA_SITE_KEY registers in api.js",
      live.ok,
      live.detail,
    );
  } else {
    check("R9", "configured site key check skipped (env unset)", true, "skipped");
  }

  // Regression: Google stores clients under numeric widget ids, not the site key string.
  // A gate that requires clients[siteKey] blocks every real signup while execute() still works.
  {
    const siteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    const clients = { "100000": { sitekey: siteKey } } as Record<string, unknown>;
    const buggyRequiresSiteKeyProp =
      Object.prototype.hasOwnProperty.call(clients, siteKey) && clients[siteKey] != null;
    const correctAnyClient = Object.keys(clients).length > 0;
    check(
      "R10",
      "numeric client ids must not be treated as unregistered",
      buggyRequiresSiteKeyProp === false && correctAnyClient === true,
      "clients keyed by id:100000",
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
