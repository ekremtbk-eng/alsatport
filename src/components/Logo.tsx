"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_MARK, BRAND_NAME } from "@/lib/brand";

export function Logo({
  compact = false,
  linked = true,
  tone = "light",
  /** When true (default), next/image emits a high-priority preload. Footer / below-fold callers should pass false. */
  priority = true,
}: {
  compact?: boolean;
  linked?: boolean;
  /** Surface the logo sits on: "dark" uses the white wordmark. */
  tone?: "light" | "dark";
  priority?: boolean;
}) {
  const logo = tone === "dark" ? BRAND_LOGO_DARK : BRAND_LOGO_LIGHT;
  // Brand assets are already display-sized WebP; skip /_next/image re-encode latency on LCP.
  // aspectRatio reserves CSS width while height is set in rem (avoids footer/header CLS).
  const inner = compact ? (
    <Image
      src={BRAND_MARK.src}
      alt=""
      width={44}
      height={44}
      className="brand-mark"
      sizes="44px"
      priority={priority}
      unoptimized
      style={{ aspectRatio: "1 / 1" }}
    />
  ) : (
    <Image
      src={logo.src}
      alt={BRAND_NAME}
      width={logo.width}
      height={logo.height}
      className={`brand-logo-img brand-logo-${tone}`}
      sizes="(max-width: 768px) 140px, 180px"
      priority={priority}
      unoptimized
      style={{ aspectRatio: `${logo.width} / ${logo.height}` }}
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
