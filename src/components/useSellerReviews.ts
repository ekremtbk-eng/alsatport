"use client";

import { useCallback, useEffect, useState } from "react";
import type { SellerReview } from "@/data/reviews";
import { apiGet, apiPost } from "@/lib/security/client";

export function useSellerReviews(sellerId: string) {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!sellerId) {
      setReviews([]);
      return;
    }
    const res = await apiGet<{ ok?: boolean; reviews?: SellerReview[] }>(
      `/api/reviews?sellerId=${encodeURIComponent(sellerId)}`,
    );
    setReviews(res.reviews ?? []);
  }, [sellerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = useCallback(
    async (input: { listingId?: string; rating: number; text: string }) => {
      setBusy(true);
      const res = await apiPost<{ ok: boolean; error?: string; review?: SellerReview }>("/api/reviews", {
        sellerId,
        listingId: input.listingId,
        rating: input.rating,
        text: input.text,
      });
      setBusy(false);
      if (!res.ok) return { ok: false as const, error: res.error };
      await reload();
      return { ok: true as const };
    },
    [reload, sellerId],
  );

  return { reviews, busy, submit, reload };
}
