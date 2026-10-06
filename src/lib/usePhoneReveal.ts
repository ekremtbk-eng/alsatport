"use client";

import { useCallback, useEffect, useState } from "react";
import { showFlashToast } from "@/components/FlashToast";
import { useI18n } from "@/context/I18nContext";
import { phoneToTel } from "@/data/store";
import { apiPost } from "@/lib/security/client";

/**
 * Listing payloads only carry a masked hint ("0532 *** ** 33"); the real number is fetched per
 * listing from the rate-limited reveal endpoint when the visitor explicitly asks for it.
 */
export function usePhoneReveal(listingId: string | undefined, hint: string) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState("");

  useEffect(() => {
    setRevealed("");
  }, [listingId]);

  const reveal = useCallback(async (): Promise<string> => {
    if (revealed) return revealed;
    if (!listingId || !hint) return "";
    if (!hint.includes("*")) {
      setRevealed(hint);
      return hint;
    }
    const res = await apiPost<{ ok?: boolean; phone?: string; error?: string }>(
      `/api/listings/${encodeURIComponent(listingId)}/phone`,
      {},
    ).catch(() => null);
    if (!res?.ok || !res.phone) {
      showFlashToast(t(res?.error ?? "auth.err.server"), "err");
      return "";
    }
    setRevealed(res.phone);
    return res.phone;
  }, [hint, listingId, revealed, t]);

  /** For `<a href={telHref}>` clicks: returns true when the browser may follow the tel: link. */
  const call = useCallback(() => {
    if (revealed) return true;
    void reveal().then((num) => {
      if (num) window.location.href = phoneToTel(num);
    });
    return false;
  }, [reveal, revealed]);

  return {
    phone: revealed || hint,
    revealed,
    telHref: revealed ? phoneToTel(revealed) : "#",
    reveal,
    call,
  };
}
