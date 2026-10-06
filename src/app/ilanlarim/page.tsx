"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { SellerListings } from "@/components/listings/SellerListings";

export default function MyListingsPage() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("my.h")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.login.p")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/giris" className="btn-ghost h-12 px-6">
            {t("nav.login")}
          </Link>
          <Link href="/kayit" className="btn-primary h-12 px-6">
            {t("nav.signup")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      <h1 className="mb-4 text-xl font-bold">{t("my.h")}</h1>
      <SellerListings rounded="rounded-2xl" />
    </div>
  );
}
