"use client";

import Link from "next/link";
import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_MARK_SRC, BRAND_NAME } from "@/lib/brand";

export function Logo({
  compact = false,
  linked = true,
  tone = "light",
}: {
  compact?: boolean;
  linked?: boolean;
  /** Surface the logo sits on: "dark" uses the white wordmark. */
  tone?: "light" | "dark";
}) {
  const logo = tone === "dark" ? BRAND_LOGO_DARK : BRAND_LOGO_LIGHT;
  const inner = compact ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={BRAND_MARK_SRC} alt="" width={44} height={44} className="brand-mark" decoding="async" />
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logo.src}
      alt={BRAND_NAME}
      width={logo.width}
      height={logo.height}
      className={`brand-logo-img brand-logo-${tone}`}
      decoding="async"
      fetchPriority="high"
    />
  );
  if (!linked) {
    return (
      <div className="brand-lockup" aria-label={BRAND_NAME}>
        {inner}
      </div>
    );
  }
  return (
    <Link href="/" className="brand-lockup" aria-label={BRAND_NAME}>
      {inner}
    </Link>
  );
}
