"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { OwnerBusiness } from "@/lib/business/shared";
import { apiGet } from "@/lib/security/client";

/** The signed-in user's own corporate record (`null` = never applied, `undefined` = loading). */
export function useOwnBusiness() {
  const { user } = useApp();
  const [business, setBusiness] = useState<OwnerBusiness | null | undefined>(undefined);
  const userId = user?.id;

  const reload = useCallback(async () => {
    if (!userId) {
      setBusiness(null);
      return;
    }
    const res = await apiGet<{ ok?: boolean; business?: OwnerBusiness | null }>("/api/account/business").catch(() => null);
    setBusiness(res?.ok ? (res.business ?? null) : null);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { business, setBusiness, reload };
}
