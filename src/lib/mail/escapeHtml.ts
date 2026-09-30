export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function firstNameFrom(fullName: string | undefined, fallback = "Üye") {
  const part = (fullName ?? "").trim().split(/\s+/).filter(Boolean)[0];
  return part || fallback;
}
