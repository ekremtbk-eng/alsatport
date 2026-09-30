import "server-only";
import { prisma } from "@/lib/db";
import type { PaidShopProduct } from "@/lib/entitlements";
import { fulfillPaidProduct, listingPatchForProfile } from "@/lib/entitlements";
import { productPriceTry } from "@/lib/payments/catalog";
import { findUserById, publicProfile, saveUser } from "@/lib/security/userStore";
import { isUuid } from "@/lib/ids";

export async function createPendingPayment(userId: string, product: PaidShopProduct) {
  const amount = productPriceTry(product);
  const merchantOid = crypto.randomUUID().replace(/-/g, "");
  const row = await prisma.payment.create({
    data: {
      userId,
      product,
      provider: "paytr",
      providerRef: merchantOid,
      amount,
      currency: "TRY",
      status: "pending",
      idempotencyKey: crypto.randomUUID(),
      metadata: { product, merchantOid },
    },
  });
  return row;
}

export async function getOwnedPayment(userId: string, id: string) {
  if (!isUuid(id)) return null;
  return prisma.payment.findFirst({ where: { id, userId } });
}

export async function applyPaytrResult(merchantOid: string, status: string, totalAmount: string) {
  const payment = await prisma.payment.findFirst({ where: { providerRef: merchantOid } });
  if (!payment) return { ok: false as const };

  if (status !== "success") {
    if (payment.status === "pending" || payment.status === "requires_action") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", failureCode: status, metadata: { ...asMeta(payment.metadata), totalAmount } },
      });
    }
    return { ok: true as const };
  }

  const expected = Math.round(Number(payment.amount) * 100);
  const got = Number(totalAmount);
  if (Number.isFinite(expected) && Number.isFinite(got) && expected !== got) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", failureCode: "amount_mismatch" },
    });
    return { ok: true as const };
  }

  const moved = await prisma.payment.updateMany({
    where: { id: payment.id, status: { in: ["pending", "requires_action"] } },
    data: { status: "succeeded", paidAt: new Date() },
  });
  if (moved.count === 0) return { ok: true as const };

  const product = payment.product as PaidShopProduct;
  const user = await findUserById(payment.userId);
  if (!user) return { ok: true as const };
  user.profile = fulfillPaidProduct(user.profile, product);
  await saveUser(user);
  if (product !== "doping") {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: product,
        status: "active",
        paymentId: payment.id,
        endsAt: user.profile.planUntil ? new Date(user.profile.planUntil) : null,
      },
    });
  }
  return { ok: true as const };
}

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function paymentPublicStatus(userId: string, id: string) {
  const row = await getOwnedPayment(userId, id);
  if (!row) return null;
  const user = await findUserById(userId);
  return {
    id: row.id,
    status: row.status,
    product: row.product,
    user: user ? publicProfile(user) : null,
    listingPatch: user ? listingPatchForProfile(user.profile) : null,
  };
}
