"use client";

import { Suspense } from "react";
import { SpecialListingsModule } from "@/components/urgent/UrgentModule";
import { useI18n } from "@/context/I18nContext";

function Fallback() {
  const { t } = useI18n();
  return <div className="p-8 text-ink">{t("common.loading")}</div>;
}

export default function FreshPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SpecialListingsModule mode="h48" />
    </Suspense>
  );
}
