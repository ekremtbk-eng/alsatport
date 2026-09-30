export function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function formatPan(value: string) {
  return digits(value, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiry(value: string) {
  const d = digits(value, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function luhnOk(pan: string) {
  const n = digits(pan, 19);
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let x = Number(n[i]);
    if (alt) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function expiryOk(value: string) {
  const d = digits(value, 4);
  if (d.length !== 4) return false;
  const mm = Number(d.slice(0, 2));
  const yy = Number(d.slice(2));
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const expYear = 2000 + yy;
  if (expYear > now.getFullYear()) return true;
  if (expYear < now.getFullYear()) return false;
  return mm >= now.getMonth() + 1;
}

export function cvvOk(value: string) {
  const d = digits(value, 4);
  return d.length === 3 || d.length === 4;
}

export function cardEntryValid(pan: string, expiry: string, cvv: string) {
  return luhnOk(pan) && expiryOk(expiry) && cvvOk(cvv);
}
