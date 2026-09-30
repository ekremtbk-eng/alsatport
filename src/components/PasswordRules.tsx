"use client";

import { passwordChecks } from "@/lib/security/passwordPolicy";
import { useI18n } from "@/context/I18nContext";

export function PasswordRules({ value }: { value: string }) {
  const { t } = useI18n();
  const checks = passwordChecks(value);
  return (
    <ul className="m-0 grid list-none gap-1 p-0 text-[11px] text-soft">
      {checks.map((c) => (
        <li key={c.id} className={c.ok ? "text-lime" : "text-soft"}>
          {c.ok ? "✓" : "○"} {t(`auth.policy.${c.id}`)}
        </li>
      ))}
    </ul>
  );
}
