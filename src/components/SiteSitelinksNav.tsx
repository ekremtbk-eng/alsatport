"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_SITELINKS } from "@/data/sitelinks";

export function SiteSitelinksNav() {
  const path = usePathname();
  return (
    <nav className="header-sitelinks" aria-label="Ana kategoriler">
      <div className="header-sitelinks-inner">
        {SITE_SITELINKS.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`header-sitelink ${active ? "is-active" : ""}`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
