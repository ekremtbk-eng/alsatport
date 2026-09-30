import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { href?: string; label: string };

export function BreadcrumbNav({
  items,
  label = "Sayfa yolu",
  className = "hub-crumb",
}: {
  items: BreadcrumbItem[];
  label?: string;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <nav className={className} aria-label={label}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden /> : null}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
