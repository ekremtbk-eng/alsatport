import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { clientIp } from "@/lib/security/rateLimit";
import { productPriceTry, productTitle } from "@/lib/payments/catalog";
import type { PaidShopProduct } from "@/lib/entitlements";
import { appOrigin } from "@/lib/site";

function cfg() {
  const merchantId = process.env.PAYTR_MERCHANT_ID?.trim() ?? "";
  const merchantKey = process.env.PAYTR_MERCHANT_KEY?.trim() ?? "";
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim() ?? "";
  if (!merchantId || !merchantKey || !merchantSalt) return null;
  return { merchantId, merchantKey, merchantSalt };
}

export function paytrConfigured() {
  return cfg() !== null;
}

export function paytrPhoneDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length === 12 && d.startsWith("90")) return d.slice(2);
  if (d.length === 13 && d.startsWith("900")) return d.slice(3);
  if (d.length === 10 && d.startsWith("5")) return d;
  return "";
}

function hmacB64(key: string, data: string) {
  return createHmac("sha256", key).update(data).digest("base64");
}

export function verifyPaytrCallback(input: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  hash: string;
}) {
  const c = cfg();
  if (!c) return false;
  const expected = Buffer.from(hmacB64(c.merchantKey, input.merchantOid + c.merchantSalt + input.status + input.totalAmount));
  const given = Buffer.from(input.hash);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function createPaytrToken(input: {
  req: Request;
  email: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  merchantOid: string;
  product: PaidShopProduct;
  paymentId: string;
}) {
  const c = cfg();
  if (!c) return { error: "pay.paytr.off" as const };
  const amountTry = productPriceTry(input.product);
  if (amountTry <= 0) return { error: "auth.err.required" as const };
  const paymentAmount = String(Math.round(amountTry * 100));
  const basket = Buffer.from(JSON.stringify([[productTitle(input.product), amountTry.toFixed(2), 1]])).toString(
    "base64",
  );
  const userIp = clientIp(input.req);
  const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : process.env.NODE_ENV !== "production" ? "1" : "0";
  const noInstallment = "0";
  const maxInstallment = "0";
  const currency = "TL";
  const tokenHash = hmacB64(
    c.merchantKey,
    c.merchantId +
      userIp +
      input.merchantOid +
      input.email +
      paymentAmount +
      basket +
      noInstallment +
      maxInstallment +
      currency +
      testMode +
      c.merchantSalt,
  );
  const origin = appOrigin();
  const okUrl = `${origin}/odeme?plan=${input.product}&payment=${input.paymentId}&paytr=ok`;
  const failUrl = `${origin}/odeme?plan=${input.product}&payment=${input.paymentId}&paytr=fail`;
  const phone = paytrPhoneDigits(input.userPhone);
  if (!phone) return { error: "complete.err.phone" as const };
  const body = new URLSearchParams({
    merchant_id: c.merchantId,
    user_ip: userIp,
    merchant_oid: input.merchantOid,
    email: input.email,
    payment_amount: paymentAmount,
    paytr_token: tokenHash,
    user_basket: basket,
    debug_on: testMode,
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.userName.slice(0, 60),
    user_address: (input.userAddress.trim() || "Türkiye").slice(0, 200),
    user_phone: phone,
    merchant_ok_url: okUrl,
    merchant_fail_url: failUrl,
    timeout_limit: "30",
    currency,
    test_mode: testMode,
    lang: "tr",
  });
  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as { status?: string; token?: string; reason?: string } | null;
  if (json?.status !== "success" || !json.token) {
    return { error: "pay.paytr.off" as const };
  }
  return {
    token: json.token,
    iframeUrl: `https://www.paytr.com/odeme/guvenli/${json.token}`,
  };
}
