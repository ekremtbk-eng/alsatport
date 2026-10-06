import "server-only";

function envStr(name: string) {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.replace(/^["']|["']$/g, "").trim() : "";
}

type Provider = "netgsm";

function provider(): Provider | null {
  return envStr("SMS_PROVIDER").toLowerCase() === "netgsm" ? "netgsm" : null;
}

function netgsmConfigured() {
  return !!(envStr("NETGSM_USERCODE") && envStr("NETGSM_PASSWORD") && envStr("NETGSM_MSGHEADER"));
}

/**
 * SMS codes are offered only when real provider credentials exist AND the feature was switched on
 * explicitly, so a half-configured provider never makes the UI claim an SMS was sent.
 */
export function smsReady() {
  if (envStr("SMS_OTP_ENABLED") !== "1") return false;
  return provider() === "netgsm" && netgsmConfigured();
}

/** Turkish mobile as 5XXXXXXXXX (Netgsm format), or null when the number is not a valid mobile. */
export function normalizeTrMobile(phone: string) {
  const d = phone.replace(/\D/g, "").replace(/^(90|0)(?=5\d{9}$)/, "");
  return /^5\d{9}$/.test(d) ? d : null;
}

/** Never logs the message body or the number: both may carry a one-time code or personal data. */
export async function sendSms(phone: string, message: string): Promise<{ ok: boolean }> {
  if (!smsReady()) return { ok: false };
  const no = normalizeTrMobile(phone);
  if (!no) return { ok: false };
  try {
    const auth = Buffer.from(`${envStr("NETGSM_USERCODE")}:${envStr("NETGSM_PASSWORD")}`).toString("base64");
    const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        msgheader: envStr("NETGSM_MSGHEADER"),
        encoding: "TR",
        iysfilter: "0",
        messages: [{ msg: message, no }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { code?: string };
    if (!res.ok || data.code !== "00") {
      console.error("[sms] provider rejected the message", res.status, data.code ?? "");
      return { ok: false };
    }
    return { ok: true };
  } catch {
    console.error("[sms] provider request failed");
    return { ok: false };
  }
}

/** Last line follows the WebOTP format so Android Chrome can offer the code for autofill. */
export function otpSmsText(otp: string, purpose: "login" | "setup") {
  const head = purpose === "login" ? "AlsatPort giriş doğrulama kodunuz" : "AlsatPort iki aşamalı doğrulama kodunuz";
  const host = envStr("SMS_WEBOTP_DOMAIN") || "alsatport.com";
  return `${head}: ${otp}. Kod 10 dakika geçerlidir, kimseyle paylaşmayın.\n\n@${host} #${otp}`;
}
