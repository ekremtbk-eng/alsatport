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
  const [fetched, setFetched] = useState<Listing | null>(null);
  const listing = cached ?? fetched;

  useEffect(() => {
    if (!rawId || rawId.startsWith("d-") || rawId.startsWith("demo-")) return;
    let cancelled = false;
    void apiGet<{ listing?: Listing }>(`/api/listings/${encodeURIComponent(rawId)}`).then((res) => {
      if (!cancelled && res.listing) setFetched(res.listing);
    });
    return () => {
      cancelled = true;
    };
  }, [rawId]);

  useEffect(() => {
    if (listing && !isServiceListing(listing)) {
      router.replace(`/ilan/${listing.id}`);
    }
  }, [listing, router]);

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
