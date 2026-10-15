"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { apiGet } from "@/lib/security/client";
import type { Listing } from "@/data/store";
import { isServiceListing } from "@/lib/serviceFirm";
import { ServiceFirmProfile } from "@/components/ServiceFirmProfile";

export function ServiceFirmPageClient() {
  const { id } = useParams<{ id: string }>();
  const { listings } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const rawId = typeof id === "string" ? decodeURIComponent(id) : "";
  const cached = listings.find((l) => l.id === rawId);
  const skipFetch = !rawId || rawId.startsWith("d-") || rawId.startsWith("demo-");
  const [result, setResult] = useState<{ id: string; listing: Listing | null } | null>(null);
  const settled = skipFetch || result?.id === rawId;
  const listing = cached ?? (result?.id === rawId ? result.listing : null);

  useEffect(() => {
    if (skipFetch) return;
    let cancelled = false;
    apiGet<{ listing?: Listing }>(`/api/listings/${encodeURIComponent(rawId)}`)
      .then((res) => res.listing ?? null)
      .catch(() => null)
      .then((found) => {
        if (!cancelled) setResult({ id: rawId, listing: found });
      });
    return () => {
      cancelled = true;
    };
  }, [rawId, skipFetch]);

  useEffect(() => {
    if (listing && !isServiceListing(listing)) {
      router.replace(`/ilan/${listing.id}`);
    }
  }, [listing, router]);

  if (!listing && !settled) {
    return (
      <p className="p-8 text-center text-sm text-muted" role="status" aria-live="polite" data-firm-loading>
        {t("common.loading")}
      </p>
    );
  }

  if (!listing) {
    return (
      <div className="p-8 text-center text-muted">
        {t("list.notfound")}{" "}
        <Link href="/ustalar-hizmetler" className="text-lime">
          {t("cat.services")}
        </Link>
      </div>
    );
  }

  if (!isServiceListing(listing)) {
    return <p className="p-8 text-center text-sm text-ink">{t("common.loading")}</p>;
  }

  return <ServiceFirmProfile listing={listing} />;
}
