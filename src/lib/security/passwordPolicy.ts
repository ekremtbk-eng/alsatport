export type PasswordCheck = {
  id: "length" | "lower" | "upper" | "digit" | "special";
  ok: boolean;
};

export function passwordChecks(value: string): PasswordCheck[] {
  return [
    { id: "length", ok: value.length >= 8 },
    { id: "lower", ok: /[a-zçğıöşü]/.test(value) },
    { id: "upper", ok: /[A-ZÇĞİÖŞÜ]/.test(value) },
    { id: "digit", ok: /\d/.test(value) },
    { id: "special", ok: /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(value) },
  ];
}

export function isStrongPassword(value: string) {
  return passwordChecks(value).every((c) => c.ok) && value.length <= 128;
}
