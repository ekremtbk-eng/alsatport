/**
 * Isolated gates for scripts/prisma-deploy.mjs — no database, no network.
 *
 *   npx tsx scripts/test-prisma-deploy-gate.ts
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const script = path.join(process.cwd(), "scripts", "prisma-deploy.mjs");
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(env: Record<string, string | undefined>) {
  const merged: NodeJS.ProcessEnv = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete merged[k];
    else merged[k] = v;
  }
  // Strip DB URLs so a mis-gated run cannot touch a real database.
  delete merged.DATABASE_URL;
  delete merged.DATABASE_URL_UNPOOLED;
  delete merged.DIRECT_URL;
  const r = spawnSync(process.execPath, [script], {
    env: merged,
    encoding: "utf8",
    timeout: 15_000,
  });
  return {
    status: r.status ?? -1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

// Local / CI default: no flags → no-op
{
  const r = run({
    VERCEL: undefined,
    VERCEL_ENV: undefined,
    ALLOW_PROD_MIGRATE: undefined,
    ALLOW_PROD_SEED: undefined,
    SEED_DEMO_LISTINGS: undefined,
  });
  check("local default is no-op (exit 0)", r.status === 0, `status=${r.status}`);
  check("local default mentions safe default", /Safe default|nothing to do/i.test(r.out), r.out.slice(0, 160));
  check("local default does not start migrate", !/running prisma migrate/i.test(r.out));
}

// Vercel Production build shape: VERCEL=1, no allow flags → no-op
{
  const r = run({
    VERCEL: "1",
    VERCEL_ENV: "production",
    ALLOW_PROD_MIGRATE: undefined,
    ALLOW_PROD_SEED: undefined,
    SEED_DEMO_LISTINGS: undefined,
  });
  check("vercel production without flags is no-op", r.status === 0 && /Safe default|nothing to do/i.test(r.out));
  check("vercel production without flags does not migrate", !/running prisma migrate/i.test(r.out));
}

// Preview: always skip; flags must refuse loudly
{
  const r = run({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    ALLOW_PROD_MIGRATE: undefined,
    ALLOW_PROD_SEED: undefined,
  });
  check("preview without flags skips (exit 0)", r.status === 0 && /skipping migrations and seeds/i.test(r.out));
}
{
  const r = run({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    ALLOW_PROD_MIGRATE: "1",
    ALLOW_PROD_SEED: "1",
  });
  check("preview with ALLOW_* refuses (exit 1)", r.status === 1 && /REFUSING/i.test(r.out), `status=${r.status}`);
  check("preview refuse does not run migrate", !/running prisma migrate/i.test(r.out));
}

// Production + demo flag alone must not run demo without migrate/seed path completing —
// but demo on vercel production refuses at end if only SEED_DEMO set... Actually if only
// SEED_DEMO_LISTINGS=1, we enter the body (not safe-default early exit), skip migrate/seed,
// then refuse demo on production with exit 1.
{
  const r = run({
    VERCEL: "1",
    VERCEL_ENV: "production",
    SEED_DEMO_LISTINGS: "1",
    ALLOW_PROD_MIGRATE: undefined,
    ALLOW_PROD_SEED: undefined,
  });
  check("vercel production refuses SEED_DEMO_LISTINGS=1", r.status === 1 && /REFUSING.*SEED_DEMO/i.test(r.out), `status=${r.status}`);
}

// Non-literal flags ignored
{
  const r = run({
    VERCEL: "1",
    VERCEL_ENV: "production",
    ALLOW_PROD_MIGRATE: "true",
    ALLOW_PROD_SEED: "0",
  });
  check('ALLOW_PROD_MIGRATE=true is ignored (not literal "1")', r.status === 0 && /Safe default|nothing to do/i.test(r.out));
}

// package.json build must not reference prisma-deploy
{
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const build = pkg.scripts.build ?? "";
  check("package.json build has no prisma-deploy", !build.includes("prisma-deploy"), build);
  check("package.json build is generate + next build", build === "prisma generate && next build", build);
  check("package.json exposes db:maintain", pkg.scripts["db:maintain"] === "node scripts/prisma-deploy.mjs");
}

console.log(failed ? `\nFAILED ${failed}` : "\nALL PRISMA DEPLOY GATE CHECKS PASSED");
process.exit(failed ? 1 : 0);
