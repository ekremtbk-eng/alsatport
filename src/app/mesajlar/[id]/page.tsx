"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useI18n } from "@/context/I18nContext";
import { isUuid } from "@/lib/ids";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { conversations, sendMessage, refreshConversation } = useApp();
  const { t } = useI18n();
  const convo = conversations.find((c) => c.id === id);
  const [text, setText] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isUuid(id)) return;
    void refreshConversation(id);
    const timer = window.setInterval(() => void refreshConversation(id), 4000);
    return () => window.clearInterval(timer);
  }, [id, refreshConversation]);

  if (!convo) {
    return (
      <div className="p-8 text-center">
        {t("chat.none")}{" "}
        <Link href="/mesajlar" className="text-lime">
          {t("post.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b border-line px-3 py-3">
        <button onClick={() => router.back()}>
          <ChevronLeft />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={convo.peerAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            {convo.peerName}
            {convo.peerVerified && <VerifiedBadge size={16} />}
          </p>
          <Link href={`/ilan/${convo.listingId}`} className="truncate text-xs text-lime">
            {convo.listingTitle}
          </Link>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {convo.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t("chat.first")}</p>
        )}
        {convo.messages.map((m) => (
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
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          void sendMessage(convo.id, text.trim());
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("chat.ph")}
          className="h-12 flex-1 rounded-xl border border-line bg-panel px-3"
        />
        <button className="btn-primary h-12 w-12">
          <Send className="relative z-10 h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
