"use client";

import Link from "next/link";

export type CategoryPillItem = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

export function CategoryPills({ items }: { items: CategoryPillItem[] }) {
  if (!items.length) return null;
  return (
    <div className="cat-pills" role="list">
      {items.map((item) => {
        const className = `cat-pill ${item.active ? "is-on" : ""}`;
        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className={className} role="listitem">
              {item.label}
            </Link>
          );
        }
        return (
          <button key={item.id} type="button" className={className} role="listitem" onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
