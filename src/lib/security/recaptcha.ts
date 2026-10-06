const SITEVERIFY = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;
export const RECAPTCHA_TOKEN_MAX = 8192;

export type RecaptchaAction = "register";

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

function usableRemoteIp(ip?: string) {
  const v = (ip ?? "").trim();
  if (!v || v.toLowerCase() === "unknown") return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(v)) return v;
  if (v.includes(":") && /^[0-9a-f:]+$/i.test(v)) return v;
  return "";
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
    console.warn("recaptcha token missing", { tokenReceived: false });
    return { ok: false, error: "auth.err.recaptcha" };
  }
  const value = token.trim();
  if (value.length < 20 || value.length > RECAPTCHA_TOKEN_MAX) {
    return { ok: false, error: "auth.err.recaptcha" };
  }

  const body = new URLSearchParams({ secret, response: value });
  const ip = usableRemoteIp(remoteIp);
  if (ip) body.set("remoteip", ip);

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
    console.warn("recaptcha siteverify failed", {
      tokenReceived: true,
      success: false,
      hostname: data.hostname ?? "",
      action: data.action ?? "",
      score: typeof data.score === "number" ? data.score : null,
      codes: data["error-codes"] ?? [],
    });
    return { ok: false, error: "auth.err.recaptcha" };
  }
  if (typeof data.score === "number" && data.score < MIN_SCORE) {
    console.warn("recaptcha score below threshold", { score: data.score });
    return { ok: false, error: "auth.err.recaptcha" };
  }
  const action = (data.action ?? "").trim();
  if (action && action !== expectedAction) {
    console.warn("recaptcha action mismatch", {
      tokenReceived: true,
      success: true,
      hostname: data.hostname ?? "",
      action,
      expectedAction,
      score: typeof data.score === "number" ? data.score : null,
    });
    return { ok: false, error: "auth.err.recaptcha" };
  }
  console.info("recaptcha siteverify ok", {
    tokenReceived: true,
    success: true,
    hostname: data.hostname ?? "",
    action,
    score: typeof data.score === "number" ? data.score : null,
  });
  return { ok: true };
}
