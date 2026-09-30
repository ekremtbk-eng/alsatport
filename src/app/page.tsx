"use client";

import Link from "next/link";
import { BadgeCheck, ChevronDown, Clock3, Headphones, ShieldCheck } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { HomeDesktopLayout } from "@/components/home/HomeDesktopLayout";
import { CategoryTree } from "@/components/home/CategoryTree";
import { HomeHero } from "@/components/home/HomeHero";
import { ShowcaseVitrine } from "@/components/home/ShowcaseVitrine";
import { HomeHubSections } from "@/components/home/HomeHubSections";
import { PopularBoards } from "@/components/home/PopularBoards";
import { SpecialFilterCards } from "@/components/special/SpecialFilterCards";
import { categories } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { gatePath, postListingHref } from "@/lib/profile";
import { useAuthModal } from "@/context/AuthModalContext";
import { InfoModal, SupportChatModal } from "@/components/TrustModals";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useI18n } from "@/context/I18nContext";
import { isPublicListing } from "@/lib/categoryCounts";
import { SITE_SITELINKS } from "@/data/sitelinks";

export default function HomePage() {
  const { listings, user } = useApp();
  const { t } = useI18n();
  const publicListings = listings.filter(isPublicListing);
  const featured = publicListings.filter((l) => l.featured || l.vip).slice(0, 8);
  const vitrine = [...publicListings]
    .sort((a, b) => {
      const score = (x: typeof a) => (x.vip ? 2 : 0) + (x.featured ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, 24);
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const [trustModal, setTrustModal] = useState<"pay" | "verify" | "support" | null>(null);

  function goPostListing() {
    if (!requireAuth("member")) return;
    router.push(postListingHref(user));
  }

  return (
    <div className="pb-16">
      <HomeHero />

      <div className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8 lg:pt-12">
          <HomeDesktopLayout>
          <div className="spec-home-mobile">
            <SpecialFilterCards compact />
          </div>
          <HomeCategoryGrid />
          <div className="trust-grid mt-8">
            <Trust
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t("home.trust.pay")}
              sub={t("home.trust.pay.s")}
              accent="lime"
              onClick={() => setTrustModal("pay")}
            />
            <Trust
              icon={<BadgeCheck className="h-5 w-5" />}
              title={t("home.trust.ver")}
              sub={t("home.trust.ver.s")}
              accent="blue"
              onClick={() => setTrustModal("verify")}
            />
            <Trust
              icon={<Clock3 className="h-5 w-5" />}
              title={t("home.trust.post")}
              sub={t("home.trust.post.s")}
              accent="orange"
              onClick={goPostListing}
            />
            <Trust
              icon={<Headphones className="h-5 w-5" />}
              title={t("home.trust.sup")}
              sub={t("home.trust.sup.s")}
              accent="lime"
              onClick={() => setTrustModal("support")}
            />
          </div>

          <ShowcaseVitrine listings={vitrine} />
          <HomeHubSections listings={publicListings} />
          <PopularBoards />

          {featured.length > 0 ? (
            <section className="home-featured-cards mt-10">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">{t("home.featured")}</h2>
                <Link href="/kategoriler" className="text-sm font-semibold text-lime">
                  {t("home.seeAll")}
                </Link>
              </div>
              <ListingGrid>
                {featured.map((l) => (
                  <ListingCard key={l.id} listing={l} compact />
                ))}
              </ListingGrid>
            </section>
          ) : null}
        </HomeDesktopLayout>
      </div>

      <InfoModal
        open={trustModal === "pay"}
        title={t("home.trust.pay")}
        onClose={() => setTrustModal(null)}
      >
        <p className="mt-2">{t("home.pay.body")}</p>
        <Link href="/odeme" className="btn-primary mt-4 h-11 w-full" onClick={() => setTrustModal(null)}>
          {t("home.pay.cta")}
        </Link>
        <button
          type="button"
          className="btn-ghost mt-2 h-11 w-full"
          onClick={() => setTrustModal("support")}
        >
          {t("home.pay.talk")}
        </button>
      </InfoModal>
      <InfoModal
        open={trustModal === "verify"}
        title={t("home.trust.ver")}
        onClose={() => setTrustModal(null)}
      >
        <div className="flex items-center gap-2">
          <VerifiedBadge size={22} />
          <p className="font-extrabold text-ink">{t("verify.badge")}</p>
        </div>
        <p className="mt-3">{t("verify.p")}</p>
        <ul className="mt-3 list-disc space-y-1.5 ps-5">
          <li>{t("verify.li1")}</li>
          <li>{t("verify.li2")}</li>
          <li>{t("verify.li3")}</li>
          <li>{t("verify.li4")}</li>
        </ul>
        <button
          type="button"
          className="btn-blue mt-4 h-11 w-full"
          onClick={() => {
            setTrustModal(null);
            router.push(gatePath(user) ?? "/profil");
          }}
        >
          {t("verify.cta")}
        </button>
      </InfoModal>
      <SupportChatModal open={trustModal === "support"} onClose={() => setTrustModal(null)} />
    </div>
  );
}

function HomeCategoryGrid() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <section className="home-cat-grid-wrap mt-2">
      <nav className="mb-3 flex flex-wrap gap-2" aria-label={t("footer.categories")}>
        {SITE_SITELINKS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-ink hover:border-lime/40 hover:text-lime"
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className={`cat-menu-toggle ${open ? "is-open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cat-menu-toggle-label">{t("nav.categories")}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="cat-menu-sheet">
          <Suspense fallback={null}>
            <CategoryTree items={categories} />
          </Suspense>
        </div>
      ) : null}
    </section>
  );
}

function Trust({
  icon,
  title,
  sub,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent: "lime" | "blue" | "orange";
  onClick: () => void;
}) {
  const color =
    accent === "blue" ? "text-blue" : accent === "orange" ? "text-orange" : "text-lime";
  return (
    <button type="button" onClick={onClick} className={`trust-card trust-card-${accent}`}>
      <span className={`icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}>
        {icon}
      </span>
      <div className="text-left">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted">{sub}</p>
      </div>
    </button>
  );
}
