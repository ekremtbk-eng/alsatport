"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AuthGateLink } from "@/components/AuthGateLink";
import { MessageCircle, Plus, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { SellerAvatar } from "@/components/SellerAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default function MessagesPage() {
  const { conversations, user, hydrated, inboxReady } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"all" | "unread" | "fav">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let c = conversations;
    if (tab === "unread") c = c.filter((x) => x.unread > 0);
    if (tab === "fav") c = c.filter((x) => x.favorite);
    const needle = q.trim().toLocaleLowerCase("tr");
    if (needle) {
      c = c.filter((x) =>
        [x.peerName, x.listingTitle, x.lastMessage].some((s) => s?.toLocaleLowerCase("tr").includes(needle)),
      );
    }
    return c;
  }, [conversations, tab, q]);

  const unreadCount = conversations.filter((c) => c.unread > 0).length;
  const loading = !hydrated || (!!user && !inboxReady);

  return (
    <div className="msg-page mx-auto max-w-2xl px-3 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("msg.h")}</h1>
        <AuthGateLink href="/ilan-ver" className="grid h-9 w-9 place-items-center rounded-full bg-elev" aria-label={t("nav.post")}>
          <Plus className="h-4 w-4" />
        </AuthGateLink>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("msg.search")}
          aria-label={t("msg.search")}
          className="h-11 w-full rounded-xl border border-line bg-panel ps-10 text-sm"
        />
      </div>
      <div className="mb-3 flex gap-2" role="tablist">
        {[
          { id: "all", label: t("cat.all") },
          { id: "unread", label: t("msg.unread", { n: unreadCount }) },
          { id: "fav", label: t("msg.fav") },
        ].map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id as typeof tab)}
            className={`chip ${tab === x.id ? "chip-on" : ""}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      {loading ? (
        <ul className="msg-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2].map((i) => (
            <li key={i} className="msg-row is-skeleton">
              <span className="msg-skel-avatar" />
              <span className="msg-skel-lines" />
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="msg-empty">
          <span className="msg-empty-ico">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </span>
          <p className="msg-empty-h">{q || tab !== "all" ? t("msg.noMatch") : t("msg.empty")}</p>
          {!user ? (
            <AuthGateLink href="/mesajlar" className="btn-primary msg-empty-cta">
              <span className="relative z-10">{t("msg.signIn")}</span>
            </AuthGateLink>
          ) : !q && tab === "all" ? (
            <p className="msg-empty-sub">{t("msg.emptyHint")}</p>
          ) : null}
        </div>
      ) : (
        <ul className="msg-list">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/mesajlar/${c.id}`} className={`msg-row ${c.unread > 0 ? "is-unread" : ""}`}>
                <SellerAvatar src={c.peerAvatar} name={c.peerName} className="msg-avatar" />
                <div className="min-w-0 flex-1">
                  <div className="msg-row-top">
                    <p className="msg-name">
                      <span className="truncate">{c.peerName}</span>
                      {c.peerVerified ? <VerifiedBadge size={14} /> : null}
                    </p>
                    <span className="msg-time">{c.time}</span>
                  </div>
                  {c.listingTitle ? <p className="msg-listing">{c.listingTitle}</p> : null}
                  <div className="msg-row-bottom">
                    <p className="msg-last">{c.lastMessage}</p>
                    {c.unread > 0 ? (
                      <span className="msg-badge" aria-label={t("msg.unreadN", { n: c.unread })}>
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
