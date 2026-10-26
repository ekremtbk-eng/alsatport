"use client";

import { passwordChecks } from "@/lib/security/passwordPolicy";
import { useI18n } from "@/context/I18nContext";

export function PasswordRules({ value, compact = false }: { value: string; compact?: boolean }) {
  const { t } = useI18n();
  const checks = passwordChecks(value);
  if (compact) {
    return (
      <div className="auth-pass-meter" role="list">
        {checks.map((c) => (
          <span key={c.id} role="listitem" className={c.ok ? "is-ok" : ""}>
            {c.ok ? "✓" : "○"} {t(`auth.policy.${c.id}`)}
          </span>
        ))}
      </div>
    );
  }
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
