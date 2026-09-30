"use client";

import Link from "next/link";
import { useI18n } from "@/context/I18nContext";

export function Logo({ compact = false, linked = true }: { compact?: boolean; linked?: boolean }) {
  const { t } = useI18n();
  const inner = (
    <>
      <img
        src="/icon.png"
        alt="AlSatPort"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-xl object-cover"
        decoding="async"
      />
      {!compact && (
        <span className="logo-wordmark leading-tight">
          <span className="logo-brand block text-[17px] font-extrabold tracking-tight text-ink sm:text-[18px]">
            Al<span className="text-lime">Sat</span>Port
          </span>
          <span className="logo-slogan mt-0.5 block text-[10px] font-semibold text-ink">{t("home.tag")}</span>
        </span>
      )}
    </>
  );
  if (!linked) {
    return <div className="flex shrink-0 items-center justify-center gap-2">{inner}</div>;
  }
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="AlSatPort">
      {inner}
    </Link>
  );
}
