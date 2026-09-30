export function maskPhoneFor3ds(phone?: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "+90 *** *** ** **";
  return `+90 *** *** ${d.slice(-4, -2)} ${d.slice(-2)}`;
}
