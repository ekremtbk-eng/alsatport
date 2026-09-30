const TAG = /<\/?[^>]+>/g;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: unknown, max = 4000) {
  if (typeof value !== "string") return "";
  return value.replace(TAG, "").replace(CTRL, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function sanitizeMultiline(value: unknown, max = 8000) {
  if (typeof value !== "string") return "";
  return value.replace(TAG, "").replace(CTRL, "").trim().slice(0, max);
}

export function sanitizeEmail(value: unknown) {
  return sanitizeText(value, 254).toLocaleLowerCase("tr");
}

export function digitsOnly(value: unknown, max = 32) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, max);
}
