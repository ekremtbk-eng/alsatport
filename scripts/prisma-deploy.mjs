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

// Preview/development builds on Vercel share env (incl. DATABASE_URL) with production,
// so they must never migrate or seed.
if (onVercel && vercelEnv !== "production") {
  console.log(`[prisma-deploy] VERCEL_ENV=${vercelEnv || "unknown"}: skipping migrations and seeds.`);
  process.exit(0);
}

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

if (onVercel) {
  console.log("[prisma-deploy] Running base seed (categories, special days; insert-only)…");
  run("node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts");
}

if (process.env.SEED_DEMO_LISTINGS === "1") {
  console.log("[prisma-deploy] SEED_DEMO_LISTINGS=1: running demo seed…");
  run("node ./node_modules/tsx/dist/cli.mjs prisma/seed-demo.ts");
} else {
  console.log("[prisma-deploy] Demo seed skipped (SEED_DEMO_LISTINGS is not 1).");
}
