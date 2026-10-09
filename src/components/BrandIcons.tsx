import { Instagram } from "lucide-react";
import type { SocialId } from "@/data/legal";
import type { AppTargetId } from "@/data/appDistribution";

type P = { className?: string };

function FacebookIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.09 24 18.1 24 12.07z" />
    </svg>
  );
}

function XIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

export function SocialIcon({ id, className = "h-4 w-4" }: { id: SocialId; className?: string }) {
  if (id === "instagram") return <Instagram className={className} aria-hidden="true" />;
  if (id === "facebook") return <FacebookIcon className={className} />;
  if (id === "x") return <XIcon className={className} />;
  if (id === "linkedin") return <LinkedInIcon className={className} />;
  return <YouTubeIcon className={className} />;
}

export function AndroidIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 18.5a9 9 0 0 1 18 0Z" fill="#3DDC84" />
      <path d="M7.4 9.6 5.3 6M16.6 9.6 18.7 6" stroke="#3DDC84" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.6" cy="14.6" r="1.05" fill="#fff" />
      <circle cx="15.4" cy="14.6" r="1.05" fill="#fff" />
    </svg>
  );
}

export function GooglePlayIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" strokeLinejoin="round">
      <path d="M3.6 2.2 13.7 12 3.6 21.8Z" fill="#00A0FF" />
      <path d="M3.6 2.2 17.4 8.4 13.7 12Z" fill="#00D46A" />
      <path d="M3.6 21.8 13.7 12l3.7 3.6Z" fill="#FF3A44" />
      <path d="M17.4 8.4 21 12l-3.6 3.6-3.7-3.6Z" fill="#FFC400" />
    </svg>
  );
}

export function AppleIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.23-1.18 3.07-.79.88-2.09 1.56-3.2 1.47-.13-1.1.4-2.26 1.14-3.1.8-.9 2.17-1.57 3.24-1.44zM20.76 17.32c-.55 1.27-.82 1.84-1.53 2.96-1 .1.56-2.23-2.48-2.26-1.8-.03-2.16.93-3.57.93-1.42 0-1.86-.9-3.58-.93-1.8-.03-3.18 1.3-4.24 3.22C3.3 18.4 2 14.84 2 12.36c0-3.9 2.53-5.95 5.02-5.95 1.66 0 3.04.93 4.1.93 1.02 0 2.62-1.02 4.57-1.02 1.47 0 3.03.4 4.12 1.5-3.62 1.98-3.03 7.14.95 8.5z" />
    </svg>
  );
}

export function WindowsIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#00A4EF" aria-hidden="true">
      <path d="M0 3.45 9.75 2.1v9.45H0Zm10.95-1.5L24 0v11.4H10.95ZM0 12.6h9.75v9.45L0 20.7Zm10.95 0H24V24l-13.05-1.8Z" />
    </svg>
  );
}

export function LinuxIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse cx="12" cy="12.6" rx="6.2" ry="8.6" fill="#1f2937" />
      <ellipse cx="12" cy="15" rx="4" ry="5.6" fill="#f8fafc" />
      <circle cx="10.2" cy="8.2" r="1.25" fill="#fff" />
      <circle cx="13.8" cy="8.2" r="1.25" fill="#fff" />
      <circle cx="10.4" cy="8.4" r=".55" fill="#111827" />
      <circle cx="13.6" cy="8.4" r=".55" fill="#111827" />
      <path d="M10.3 10.2h3.4L12 12.1Z" fill="#f59e0b" />
      <ellipse cx="8.4" cy="21.2" rx="2.6" ry="1.2" fill="#f59e0b" />
      <ellipse cx="15.6" cy="21.2" rx="2.6" ry="1.2" fill="#f59e0b" />
    </svg>
  );
}

export function AppTargetIcon({ id, className = "h-5 w-5" }: { id: AppTargetId; className?: string }) {
  if (id === "play") return <GooglePlayIcon className={className} />;
  if (id === "apk") return <AndroidIcon className={className} />;
  if (id === "appstore" || id === "mac") return <AppleIcon className={className} />;
  if (id === "windows") return <WindowsIcon className={className} />;
  return <LinuxIcon className={className} />;
}
