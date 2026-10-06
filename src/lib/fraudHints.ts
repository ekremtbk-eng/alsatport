/**
 * Advisory only: flags incoming messages that ask for money up front so the reader sees a
 * safety reminder. Messages are never blocked or altered — sharing an IBAN or phone number
 * is legitimate in many trades.
 */
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const word = (alts: string) => new RegExp(`${B}(?:${alts})${E}`, "iu");

const ADVANCE_PAYMENT = word(
  "kapora(?:yı|yi|sı|si)?|ön ?ödeme|on ?odeme|peşinat|avans|depozito|deposit|advance payment|hediye ?kartı?|gift ?card|western ?union|moneygram|usdt",
);
const IBAN = /(?<![A-Z0-9])TR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}(?!\d)/i;
const SEND_MONEY = word("gönder|gonder|yatır|yatir|havale|eft|transfer|send");

export function paymentRiskHint(text: string): boolean {
  if (!text) return false;
  return ADVANCE_PAYMENT.test(text) || (IBAN.test(text) && SEND_MONEY.test(text));
}
