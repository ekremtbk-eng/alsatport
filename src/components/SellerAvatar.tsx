"use client";

import { useState } from "react";

/** A person's photo, or their initials when there is no photo or it fails to load. */
export function SellerAvatar({ src, name, className = "" }: { src?: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    const initials =
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toLocaleUpperCase("tr") ?? "")
        .join("") || "?";
    return (
      <span className={`avatar-initials ${className}`} aria-hidden>
        {initials}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} onError={() => setBroken(true)} />;
}
