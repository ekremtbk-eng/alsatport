"use client";

import { Suspense } from "react";
import { UrgentModule } from "@/components/urgent/UrgentModule";
import { useI18n } from "@/context/I18nContext";

function Fallback() {
  const { t } = useI18n();
  return <div className="p-8 text-ink">{t("common.loading")}</div>;
}

export default function AcilPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <UrgentModule />
    </Suspense>
  );
}
