"use client";

import { useState } from "react";
import { brandInitials, resolveBrandMark } from "@/lib/brandMarks";

/**
 * Brand logo from Simple Icons (inline SVG) or a local Wikimedia/simplified file mark.
 * Missing or failed loads always fall back to letter initials — never a broken image.
 */
export function BrandMark({
  label,
  size = 20,
  className = "",
  title,
}: {
  label: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const mark = resolveBrandMark(label);
  const tip = title ?? mark?.title ?? label;
  const [imgFailed, setImgFailed] = useState(false);

  if (mark?.kind === "si") {
    return (
      <span
        className={`brand-mark ${className}`.trim()}
        style={{ width: size, height: size }}
        title={tip}
        aria-hidden="true"
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          className="brand-mark-svg"
        >
          <title>{tip}</title>
          <path d={mark.path} fill={`#${mark.hex}`} />
        </svg>
      </span>
    );
  }

  if (mark?.kind === "file" && !imgFailed) {
    return (
      <span
        className={`brand-mark brand-mark-file ${className}`.trim()}
        style={{ width: size, height: size }}
        title={tip}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mark.file}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`brand-mark brand-mark-fallback ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
      title={tip}
      aria-hidden="true"
    >
      {brandInitials(label)}
    </span>
  );
}
