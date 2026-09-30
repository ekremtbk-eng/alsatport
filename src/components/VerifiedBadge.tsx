"use client";

import { useId } from "react";

export function VerifiedBadge({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <span
      className={`verified-badge ${className}`}
      title="Kimliği doğrulanmış güvenilir satıcı"
      aria-label="Kimliği doğrulanmış"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill={`url(#${gid})`} />
        <path
          d="M7.2 12.2l3 3.1 6.6-6.6"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id={gid} x1="3" y1="2" x2="21" y2="22">
            <stop stopColor="#7ec8ff" />
            <stop offset="0.45" stopColor="#2f8cff" />
            <stop offset="1" stopColor="#3b6cff" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
