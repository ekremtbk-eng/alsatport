/**
 * Local-only check of PayTR callback amount handling (run with `--conditions react-server`).
 * Refuses any non-loopback DATABASE_URL.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { applyPaytrResult } from "@/lib/payments/store";

const db = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(db)) {
  console.error("Refusing: DATABASE_URL must point at a loopback database.");
  process.exit(1);
}

const TAG = randomBytes(4).toString("hex");
let failed = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function payment(userId: string, amount: number) {
  const oid = randomBytes(12).toString("hex");
  await prisma.payment.create({
    data: { userId, product: "doping", provider: "paytr", providerRef: oid, amount, currency: "TRY", status: "pending", idempotencyKey: randomBytes(16).toString("hex") },
  });
  return oid;
}
const statusOf = async (oid: string) => (await prisma.payment.findFirst({ where: { providerRef: oid }, select: { status: true } }))?.status;

async function main() {
  const user = await prisma.user.create({
    data: { email: `paytr-${TAG}@sectest.invalid`, username: `sectest_paytr_${TAG}`, role: "member", passwordHash: `!unusable-${TAG}`, profile: { create: { displayName: "PayTR test" } } },
  });
  try {
    let oid = await payment(user.id, 100);
    await applyPaytrResult(oid, "success", "10000", "10000");
    check("Exact amount succeeds", (await statusOf(oid)) === "succeeded");

    oid = await payment(user.id, 100);
    await applyPaytrResult(oid, "success", "10850", "10000");
    check("Installment interest on total_amount still succeeds", (await statusOf(oid)) === "succeeded");

    oid = await payment(user.id, 100);
    await applyPaytrResult(oid, "success", "100", "100");
    check("Underpayment rejected", (await statusOf(oid)) === "failed");

    oid = await payment(user.id, 100);
    await applyPaytrResult(oid, "success", "abc", "");
    check("Unparseable amounts fail closed", (await statusOf(oid)) === "failed");

    oid = await payment(user.id, 100);
    await applyPaytrResult(oid, "success", "10000", "");
    check("Missing payment_amount fails closed", (await statusOf(oid)) === "failed");
  } finally {
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
