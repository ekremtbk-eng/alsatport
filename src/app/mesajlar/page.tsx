"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AuthGateLink } from "@/components/AuthGateLink";
import { Plus, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";

export default function MessagesPage() {
  const { conversations } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"all" | "unread" | "fav">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let c = conversations;
    if (tab === "unread") c = c.filter((x) => x.unread > 0);
    if (tab === "fav") c = c.filter((x) => x.favorite);
    if (q) c = c.filter((x) => x.peerName.toLowerCase().includes(q.toLowerCase()));
    return c;
  }, [conversations, tab, q]);

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("msg.h")}</h1>
        <AuthGateLink href="/ilan-ver" className="grid h-9 w-9 place-items-center rounded-full bg-elev">
          <Plus className="h-4 w-4" />
        </AuthGateLink>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("msg.search")}
          className="h-11 w-full rounded-xl border border-line bg-panel ps-10 text-sm"
        />
      </div>
      <div className="mb-3 flex gap-2">
        {[
          { id: "all", label: t("cat.all") },
          { id: "unread", label: t("msg.unread", { n: conversations.filter((c) => c.unread).length }) },
          { id: "fav", label: t("msg.fav") },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`chip ${tab === t.id ? "chip-on" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/mesajlar/${c.id}`} className="flex items-center gap-3 px-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.peerAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{c.peerName}</p>
                  <span className="text-xs text-muted">{c.time}</span>
                </div>
                <p className="truncate text-sm text-muted">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="badge-vip grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px]">
                  {c.unread}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
