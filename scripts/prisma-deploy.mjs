/**
 * Explicit database maintenance — NOT part of `npm run build`.
 *
 * Safe default: do nothing and exit 0.
 *
 * Opt-in (must be the literal string "1"):
 *   ALLOW_PROD_MIGRATE=1  → prisma migrate deploy
 *   ALLOW_PROD_SEED=1     → base seed (categories + special days, insert-only)
 *   SEED_DEMO_LISTINGS=1  → demo seed (never on Vercel Production)
 *
 * Hard refusals:
 *   - Vercel Preview / non-production: migrate and seed never run (even if flags are set).
 *   - Flags other than the literal "1" are ignored (e.g. ALLOW_PROD_MIGRATE=0 / true).
 *
 * See docs/production-db-maintenance.md for the approved operator procedure.
 */
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function sleep(seconds) {
  try {
    execSync(process.platform === "win32" ? `timeout /t ${seconds} /nobreak >NUL` : `sleep ${seconds}`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    const end = Date.now() + seconds * 1000;
    while (Date.now() < end) {
      /* wait for advisory lock to clear */
    }
  }
}

function flag(name) {
  return process.env[name] === "1";
}

function deployWithRetry(attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      run("npx prisma migrate deploy");
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts) sleep(8 * i);
    }
  }
  throw lastErr;
}

const onVercel = Boolean(process.env.VERCEL);
const vercelEnv = process.env.VERCEL_ENV || "";
const allowMigrate = flag("ALLOW_PROD_MIGRATE");
const allowSeed = flag("ALLOW_PROD_SEED");
const allowDemo = flag("SEED_DEMO_LISTINGS");

// Preview / Vercel non-production: never migrate or seed, even with opt-in flags.
if (onVercel && vercelEnv !== "production") {
  if (allowMigrate || allowSeed || allowDemo) {
    console.error(
      `[prisma-deploy] REFUSING: ALLOW_* / SEED_DEMO flags are set but VERCEL_ENV=${vercelEnv || "unknown"}. ` +
        "Migrate/seed are blocked on Preview and non-production Vercel builds.",
    );
    process.exit(1);
  }
  console.log(`[prisma-deploy] VERCEL_ENV=${vercelEnv || "unknown"}: skipping migrations and seeds.`);
  process.exit(0);
}

if (!allowMigrate && !allowSeed && !allowDemo) {
  console.log(
    "[prisma-deploy] Safe default: no ALLOW_PROD_MIGRATE=1 / ALLOW_PROD_SEED=1 / SEED_DEMO_LISTINGS=1 — nothing to do.",
  );
  process.exit(0);
}

if (allowMigrate) {
  console.log("[prisma-deploy] ALLOW_PROD_MIGRATE=1: running prisma migrate deploy…");
  try {
    deployWithRetry();
  } catch {
    try {
      run("npx prisma migrate resolve --rolled-back 20260930184500_vasita_subcategories");
    } catch {
      /* already resolved or not in failed state */
    }
    sleep(5);
    deployWithRetry();
  }
} else {
  console.log("[prisma-deploy] migrate skipped (set ALLOW_PROD_MIGRATE=1 to run).");
}

if (allowSeed) {
  console.log("[prisma-deploy] ALLOW_PROD_SEED=1: running base seed (categories, special days; insert-only)…");
  run("node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts");
} else {
  console.log("[prisma-deploy] base seed skipped (set ALLOW_PROD_SEED=1 to run).");
}

// Demo listings must never run on Vercel Production (even if SEED_DEMO_LISTINGS=1).
if (onVercel && vercelEnv === "production") {
  if (allowDemo) {
    console.error(
      "[prisma-deploy] REFUSING: SEED_DEMO_LISTINGS=1 is not allowed on Vercel Production.",
    );
    process.exit(1);
  }
  console.log("[prisma-deploy] Demo seed disabled in production.");
} else if (allowDemo) {
  console.log("[prisma-deploy] SEED_DEMO_LISTINGS=1: running demo seed…");
  run("node ./node_modules/tsx/dist/cli.mjs prisma/seed-demo.ts");
} else {
  console.log("[prisma-deploy] Demo seed skipped (SEED_DEMO_LISTINGS is not 1).");
}
