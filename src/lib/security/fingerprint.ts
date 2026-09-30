"use client";

const KEY = "ap_device_fp";

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasHint() {
  try {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 20;
    const ctx = c.getContext("2d");
    if (!ctx) return "nocanvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#111827";
    ctx.fillText("AlsatPort", 2, 2);
    return c.toDataURL().slice(-48);
  } catch {
    return "nocanvas";
  }
}

export async function deviceFingerprint() {
  if (typeof window === "undefined") return "";
  try {
    const cached = sessionStorage.getItem(KEY);
    if (cached && cached.length === 64) return cached;
    const nav = window.navigator;
    const raw = [
      nav.userAgent,
      nav.language,
      nav.languages?.join(",") ?? "",
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(nav.hardwareConcurrency ?? 0),
      String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? 0),
      canvasHint(),
    ].join("|");
    const hash = await sha256Hex(raw);
    sessionStorage.setItem(KEY, hash);
    return hash;
  } catch {
    return "";
  }
}
