const SITEVERIFY = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;
const TOKEN_MAX = 4000;

export type RecaptchaAction = "register" | "listing";

type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

function recaptchaSecret() {
  return (process.env.RECAPTCHA_SECRET_KEY ?? "").trim();
}

export async function verifyRecaptchaToken(
  token: unknown,
  expectedAction: RecaptchaAction,
  remoteIp?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = recaptchaSecret();
  if (!secret) {
    return { ok: false, error: "auth.err.recaptcha" };
  }
  if (typeof token !== "string") {
    return { ok: false, error: "auth.err.recaptcha" };
  }
  const value = token.trim();
  if (value.length < 20 || value.length > TOKEN_MAX) {
    return { ok: false, error: "auth.err.recaptcha" };
  }

  const body = new URLSearchParams({ secret, response: value });
  if (remoteIp) body.set("remoteip", remoteIp);

  let data: SiteVerifyResponse;
  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    data = (await res.json()) as SiteVerifyResponse;
  } catch {
    return { ok: false, error: "auth.err.recaptcha" };
  }

  if (!data.success) {
    return { ok: false, error: "auth.err.recaptcha" };
  }
  if (typeof data.score === "number" && data.score < MIN_SCORE) {
    return { ok: false, error: "auth.err.recaptcha" };
  }
  if (data.action && data.action !== expectedAction) {
    return { ok: false, error: "auth.err.recaptcha" };
  }
  return { ok: true };
}
