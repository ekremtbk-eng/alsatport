export function listingPublicUrl(id: string) {
  if (typeof window === "undefined") return `/ilan/${id}`;
  return `${window.location.origin}/ilan/${encodeURIComponent(id)}`;
}

export function listingShareText(title: string, priceLabel: string, url: string) {
  const bits = [title.trim(), priceLabel.trim()].filter(Boolean);
  return `${bits.join(" · ")}\n${url}`;
}

export function socialShareHrefs(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${t}`,
    telegram: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(text.replace(url, "").trim())}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(text.replace(url, "").trim())}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  };
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
