import { LEGAL_BRAND } from "@/data/legal";
import { CANONICAL_ORIGIN } from "@/lib/site";

export function listingShareUrl(id: string, kind: "listing" | "firm" = "listing") {
  if (kind === "firm") {
    return `${CANONICAL_ORIGIN}/ustalar-hizmetler/firma/${encodeURIComponent(id)}`;
  }
  return `${CANONICAL_ORIGIN}/ilan/${encodeURIComponent(id)}`;
}

export function listingPublicUrl(id: string, kind: "listing" | "firm" = "listing") {
  return listingShareUrl(id, kind);
}

export function listingWebShareData(input: { title: string; priceLabel: string; url: string }) {
  const title = input.title.trim();
  const price = input.priceLabel.trim();
  return {
    title: [title, price].filter(Boolean).join(" · ") || LEGAL_BRAND,
    text: [title, price].filter(Boolean).join("\n"),
    url: input.url,
  };
}

export function canUseWebShare(data: ShareData) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare(data);
  } catch {
    return true;
  }
}

export function listingShareBlurb(description?: string, max = 140) {
  const d = (description ?? "").replace(/\s+/g, " ").trim();
  if (!d) return "";
  return d.length > max ? `${d.slice(0, max - 1).trim()}…` : d;
}

export function listingWhatsAppMessage(input: {
  title: string;
  priceLabel: string;
  url: string;
  description?: string;
}) {
  const title = input.title.trim();
  const price = input.priceLabel.trim();
  const blurb = listingShareBlurb(input.description, 160);
  const lines = [`${LEGAL_BRAND} ilanı`, "", title];
  if (price) lines.push(price);
  if (blurb) lines.push("", blurb);
  lines.push("", input.url);
  return lines.join("\n");
}

/** Kısa satır: WhatsApp Durum / hikâye yapıştırmasına uygun. */
export function listingWhatsAppStatusText(input: { title: string; priceLabel: string; url: string }) {
  const head = [input.title.trim(), input.priceLabel.trim()].filter(Boolean).join(" · ");
  return `${head}\n${input.url}`;
}

export function listingTweetText(input: { title: string; priceLabel: string }) {
  const head = [input.title.trim(), input.priceLabel.trim()].filter(Boolean).join(" · ");
  return `${head} · ${LEGAL_BRAND}`;
}

export function listingTelegramText(input: {
  title: string;
  priceLabel: string;
  description?: string;
}) {
  const blurb = listingShareBlurb(input.description, 120);
  return [input.title.trim(), input.priceLabel.trim(), blurb, LEGAL_BRAND].filter(Boolean).join("\n");
}

export function whatsappShareHref(text: string) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function telegramShareHref(url: string, text: string) {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function twitterShareHref(url: string, text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function facebookShareHref(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function openShareHref(href: string) {
  const w = window.open(href, "_blank", "noopener,noreferrer");
  if (!w) window.location.assign(href);
}

export async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fallback */
    }
  }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:0;left:0;width:8px;height:8px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
