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
