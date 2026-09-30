"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Zap } from "lucide-react";
import { findCategory } from "@/data/categories";
import { LiveCount } from "@/components/LiveCount";
import { useI18n } from "@/context/I18nContext";

export function SpecialFilterCards({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const urgent = findCategory("filter-urgent");
  const fresh = findCategory("filter-48h");

  return (
    <div className={`spec-rail ${compact ? "is-compact" : ""}`}>
      {compact ? null : <p className="spec-rail-label">{t("cat.filters")}</p>}
      <div className="spec-rail-grid">
        {urgent ? (
          <Link href="/acil" className={`spec-card is-urgent ${path === "/acil" ? "is-on" : ""}`}>
            <span className="spec-card-glow" aria-hidden />
            <span className="spec-icon">
              <Zap className="h-5 w-5" fill="currentColor" />
            </span>
            <span className="spec-copy">
              <strong>{t("acil.title")}</strong>
              <em>{t("spec.urgent.s")}</em>
            </span>
            <LiveCount cat={urgent} className="spec-count" />
          </Link>
        ) : null}
        {fresh ? (
          <Link href="/son-48-saat" className={`spec-card is-fresh ${path === "/son-48-saat" ? "is-on" : ""}`}>
            <span className="spec-card-glow" aria-hidden />
            <span className="spec-icon">
              <Clock3 className="h-5 w-5" />
            </span>
            <span className="spec-copy">
              <strong>{t("fresh.title")}</strong>
              <em>{t("spec.fresh.s")}</em>
            </span>
            <LiveCount cat={fresh} className="spec-count" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
