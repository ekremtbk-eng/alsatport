"use client";

import { SpecialFilterCards } from "@/components/special/SpecialFilterCards";
import { HomeCategoryRail } from "@/components/home/HomeCategoryRail";
import { useI18n } from "@/context/I18nContext";

export function Sidebar() {
  const { t } = useI18n();

  return (
    <aside className="desktop-sidebar cat-rail-aside">
      <SpecialFilterCards compact />
      <p className="cat-section-label">{t("nav.categories")}</p>
      <HomeCategoryRail />
    </aside>
  );
}
