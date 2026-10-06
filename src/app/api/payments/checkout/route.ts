import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paymentsPaused } from "@/lib/campaign";
import { isPaidShopProduct } from "@/lib/entitlements";
import { createPendingPayment } from "@/lib/payments/store";
import { createPaytrToken, paytrConfigured } from "@/lib/payments/paytr";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { checkoutBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  if (paymentsPaused()) {
    return NextResponse.json({ ok: false, error: "pay.campaign" }, { status: 403 });
  }
  if (!paytrConfigured()) {
    return NextResponse.json({ ok: false, error: "pay.paytr.off" }, { status: 503 });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`paytr:${ip}:${auth.user.id}`, LIMITS.paytr.limit, LIMITS.paytr.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, checkoutBodySchema);
  if (!parsed.ok) return parsed.response;
  const product = parsed.data.product;
  if (!isPaidShopProduct(product)) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }

  const payment = await createPendingPayment(auth.user.id, product);
  const token = await createPaytrToken({
    req,
    email: auth.user.email,
    userName: auth.user.profile.fullName || auth.user.profile.displayName || auth.user.username,
    userPhone: auth.user.profile.phone ?? "",
    userAddress: [auth.user.profile.address, auth.user.profile.city].filter(Boolean).join(", ") || "Türkiye",
    merchantOid: payment.providerRef ?? payment.id.replace(/-/g, ""),
    product,
    paymentId: payment.id,
  });
  if ("error" in token) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", failureCode: "token" },
    });
    return NextResponse.json({ ok: false, error: token.error }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    token: token.token,
    iframeUrl: token.iframeUrl,
  });
}
