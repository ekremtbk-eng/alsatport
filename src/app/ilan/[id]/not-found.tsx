"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function ListingNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <SearchX className="h-10 w-10 text-muted" strokeWidth={1.6} aria-hidden="true" />
      <h1 className="mt-4 text-lg font-semibold text-ink">{t("list.gone")}</h1>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/ara" className="btn-primary inline-flex h-11 items-center px-5">
          {t("common.allAds")}
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold text-ink">
          {t("nav.home")}
        </Link>
      </div>
    </div>
  );
}
