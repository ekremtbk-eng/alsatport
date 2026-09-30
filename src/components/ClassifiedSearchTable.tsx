"use client";

import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import type { Listing } from "@/data/store";

function specValue(listing: Listing, label: string) {
  return listing.specs.find((s) => s.label.toLocaleLowerCase("tr") === label.toLocaleLowerCase("tr"))?.value;
}

export function ClassifiedSearchTable({
  listings,
  showProduct = true,
}: {
  listings: Listing[];
  showProduct?: boolean;
}) {
  const { t, formatMoney } = useI18n();
  return (
    <div className="cls-table-wrap">
      <table className="cls-table">
        <thead>
          <tr>
            <th>{t("list.col.title")}</th>
            {showProduct ? <th>{t("list.fact.product")}</th> : null}
            <th>{t("list.price")}</th>
            <th>{t("list.posted")}</th>
            <th>{t("list.col.city")}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const product = specValue(listing, "Ürün");
            return (
              <tr key={listing.id}>
                <td>
                  <Link href={`/ilan/${listing.id}`} className="cls-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.images[0]} alt="" className="cls-thumb" />
                    <span className="cls-title">
                      {listing.urgent ? <span className="cls-urgent">{t("cat.filter-urgent")}</span> : null}
                      {listing.title}
                    </span>
                  </Link>
                </td>
                {showProduct ? <td className="cls-muted">{product || "—"}</td> : null}
                <td className="cls-price">{formatMoney(listing.price)}</td>
                <td className="cls-muted">{listing.createdAt}</td>
                <td className="cls-muted">
                  {listing.city}
                  {listing.district ? ` / ${listing.district}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
