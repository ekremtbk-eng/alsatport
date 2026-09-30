"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Send, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Listing } from "@/data/store";
import { VerifiedBadge } from "./VerifiedBadge";
import { useI18n } from "@/context/I18nContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { isUuid } from "@/lib/ids";

const REPLY_KEYS = ["chat.r1", "chat.r2", "chat.r3", "chat.r4"] as const;

export function SellerChatPopup({
  listing,
  open,
  onClose,
}: {
  listing: Listing;
  open: boolean;
  onClose: () => void;
}) {
  const { user, conversations, startConversation, sendMessage, refreshConversation } = useApp();
  const { t } = useI18n();
  const { requireAuth } = useAuthModal();
  const [cid, setCid] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const replyIdx = useRef(0);

  useEffect(() => {
    if (!open) return;
    if (!requireAuth("member")) {
      onClose();
      return;
    }
    let cancelled = false;
    void (async () => {
      const id = await startConversation(listing);
      if (!cancelled && id) {
        setCid(id);
        if (isUuid(listing.id)) void refreshConversation(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listing, user, requireAuth, onClose, startConversation, refreshConversation]);

  useEffect(() => {
    if (open) setMinimized(false);
  }, [open]);

  useEffect(() => {
    if (!open || !cid || !isUuid(listing.id)) return;
    const timer = window.setInterval(() => void refreshConversation(cid), 4000);
    return () => window.clearInterval(timer);
  }, [open, cid, refreshConversation]);

  const convo = conversations.find((c) => c.id === cid);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [convo?.messages.length, typing, open, minimized]);

  async function submit() {
    const id = cid ?? (await startConversation(listing));
    if (!id || !text.trim()) return;
    if (!cid) setCid(id);
    const msg = text.trim();
    const ok = await sendMessage(id, msg, true);
    if (!ok) return;
    setText("");
    if (!isUuid(listing.id)) {
      setTyping(true);
      window.setTimeout(() => {
        const reply = t(REPLY_KEYS[replyIdx.current % REPLY_KEYS.length]);
        replyIdx.current += 1;
        void sendMessage(id, reply, false);
        setTyping(false);
      }, 900);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto w-auto max-w-md lg:inset-x-auto lg:right-6 lg:bottom-6">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="chat-dock flex w-full items-center gap-3 rounded-2xl bg-panel px-3 py-2.5 text-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.sellerAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {listing.sellerName}
          </span>
          {listing.sellerVerified && <VerifiedBadge size={16} />}
          <span className="text-[11px] text-lime">{t("nav.messages")}</span>
        </button>
      ) : (
        <div className="chat-dock overflow-hidden rounded-3xl bg-panel">
          <div className="flex items-center gap-2 border-b border-line bg-elev/80 px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.sellerAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                {listing.sellerName}
                {listing.sellerVerified && <VerifiedBadge size={16} />}
              </p>
              <p className="truncate text-[11px] text-muted">{listing.title}</p>
            </div>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-card"
              onClick={() => setMinimized(true)}
              aria-label={t("common.close")}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-card"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scroller} className="h-72 space-y-2 overflow-auto bg-bg/40 p-3">
            {(!convo || convo.messages.length === 0) && (
              <p className="rounded-2xl bg-elev px-3 py-2 text-center text-xs text-muted">
                {t("chat.start")}
              </p>
            )}
            {convo?.messages.map((m) => (
              <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.fromMe ? "bubble-me" : "bg-elev"
                  }`}
                >
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.fromMe ? "text-bg/70" : "text-muted"}`}>
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
            {typing && (
              <p className="text-xs text-blue">{t("chat.seller")}</p>
            )}
          </div>
          <form
            className="flex gap-2 border-t border-line p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chat.ph")}
              className="h-11 flex-1 rounded-xl border border-line bg-card px-3 text-sm"
            />
            <button type="submit" className="btn-primary h-11 w-11">
              <Send className="relative z-10 h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
