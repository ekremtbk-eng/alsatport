"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCheck, ChevronLeft, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useEffect, useRef, useState } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useI18n } from "@/context/I18nContext";
import { isUuid } from "@/lib/ids";
import { apiDelete, apiPost } from "@/lib/security/client";
import { paymentRiskHint } from "@/lib/fraudHints";
import { SafetyNotice } from "@/components/listing/SafetyNotice";
import { SellerAvatar } from "@/components/SellerAvatar";

/**
 * On phones and tablets the conversation fills the visual viewport (html.chat-screen): iOS keeps fixed boxes on
 * the layout viewport while the keyboard is open, so the box follows visualViewport's height and offset and the
 * message field always sits right above the keyboard.
 */
function useChatViewport() {
  useEffect(() => {
    const html = document.documentElement;
    const vv = window.visualViewport;
    html.classList.add("chat-screen");
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = vv ? vv.height : window.innerHeight;
        html.style.setProperty("--chat-vh", `${Math.round(h)}px`);
        html.style.setProperty("--chat-top", `${Math.round(vv ? vv.offsetTop : 0)}px`);
        html.classList.toggle("chat-kb", window.innerHeight - h > 80);
      });
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      html.classList.remove("chat-screen", "chat-kb");
      html.style.removeProperty("--chat-vh");
      html.style.removeProperty("--chat-top");
    };
  }, []);
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { conversations, sendMessage, refreshConversation, hydrated } = useApp();
  const { t } = useI18n();
  const convo = conversations.find((c) => c.id === id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(() => !isUuid(id));
  const scroller = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useChatViewport();

  useEffect(() => {
    if (!isUuid(id)) return;
    void refreshConversation(id).finally(() => setLoaded(true));
    const timer = window.setInterval(() => void refreshConversation(id), 4000);
    return () => window.clearInterval(timer);
  }, [id, refreshConversation]);

  const count = convo?.messages.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  if (!convo) {
    return (
      <div className="chat-page chat-missing p-8 text-center">
        {!hydrated || !loaded ? (
          <p className="text-sm text-muted">{t("common.loading")}</p>
        ) : (
          <>
            {t("chat.none")}{" "}
            <Link href="/mesajlar" className="text-lime">
              {t("post.back")}
            </Link>
          </>
        )}
      </div>
    );
  }

  const blocked = !!convo.blockedByMe || !!convo.blockedMe;
  const seenAt = convo.peerReadAt ?? 0;
  const lastSeenMine = seenAt
    ? [...convo.messages].reverse().find((m) => m.fromMe && m.at !== undefined && m.at <= seenAt)?.id
    : undefined;

  async function toggleBlock() {
    if (!convo || !isUuid(convo.id)) return;
    if (!convo.blockedByMe && !window.confirm(t("chat.block.confirm"))) return;
    setBusy(true);
    setError("");
    const res = convo.blockedByMe
      ? await apiDelete<{ ok: boolean; error?: string }>(`/api/account/blocks?conversationId=${encodeURIComponent(convo.id)}`)
      : await apiPost<{ ok: boolean; error?: string }>("/api/account/blocks", { conversationId: convo.id });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    await refreshConversation(convo.id);
  }

  async function submit() {
    const msg = text.trim();
    if (!convo || !msg || blocked || sending) return;
    setSending(true);
    setError("");
    const ok = await sendMessage(convo.id, msg);
    setSending(false);
    if (ok) setText("");
    else setError(t("chat.sendFailed"));
  }

  return (
    <div className="chat-page mx-auto flex min-h-[calc(100vh-140px)] max-w-2xl flex-col">
      <div className="chat-head flex items-center gap-3 border-b border-line px-3 py-3">
        <button type="button" className="chat-back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/mesajlar"))} aria-label={t("post.back")}>
          <ChevronLeft />
        </button>
        <SellerAvatar src={convo.peerAvatar} name={convo.peerName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{convo.peerName}</span>
            {convo.peerVerified && <VerifiedBadge size={16} />}
          </p>
          <Link href={`/ilan/${convo.listingId}`} className="chat-listing truncate text-xs text-lime">
            {convo.listingTitle}
          </Link>
        </div>
        {isUuid(convo.id) ? (
          <button
            type="button"
            className={`chip shrink-0 text-xs ${convo.blockedByMe ? "" : "text-orange"}`}
            disabled={busy}
            onClick={() => void toggleBlock()}
          >
            <Ban className="h-3.5 w-3.5" aria-hidden /> {convo.blockedByMe ? t("acct.unblock") : t("chat.block")}
          </button>
        ) : null}
      </div>
      {blocked ? (
        <p className="border-b border-line bg-elev px-3 py-2 text-center text-xs font-semibold">
          {convo.blockedByMe ? t("chat.blocked.me") : t("chat.blocked.them")}
        </p>
      ) : null}
      <div ref={scroller} className="chat-scroll flex-1 space-y-2 overflow-auto p-3" aria-live="polite">
        <SafetyNotice />
        {convo.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t("chat.first")}</p>
        )}
        {convo.messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.fromMe ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.fromMe ? "bubble-me" : "bg-elev"
              }`}
            >
              <p className="chat-text">{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.fromMe ? "text-bg/70" : "text-muted"}`}>
                {m.time}
              </p>
            </div>
            {!m.fromMe && paymentRiskHint(m.text) ? (
              <p role="note" className="mt-1 max-w-[80%] text-[11px] font-semibold text-orange">
                {t("chat.safe.hint")}
              </p>
            ) : null}
            {m.id === lastSeenMine ? (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-lime">
                <CheckCheck className="h-3 w-3" aria-hidden /> {t("chat.seen")}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {error ? (
        <p className="chat-error px-3 pt-2 text-xs font-semibold text-orange" role="alert">
          {error}
        </p>
      ) : null}
      <form
        className="chat-compose flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={blocked ? t("chat.blocked.input") : t("chat.ph")}
          aria-label={t("chat.ph")}
          disabled={blocked}
          enterKeyHint="send"
          maxLength={4000}
          className="h-12 flex-1 rounded-xl border border-line bg-panel px-3 disabled:opacity-60"
        />
        <button
          type="submit"
          className="btn-primary h-12 w-12"
          disabled={blocked || sending || !text.trim()}
          aria-label={t("chat.send")}
          // Keeps the field focused so the phone keyboard stays open after sending.
          onPointerDown={(e) => e.preventDefault()}
        >
          <Send className="relative z-10 h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
