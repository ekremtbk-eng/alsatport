"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, X } from "lucide-react";
import { LEGAL_EMAIL_DESTEK, LEGAL_PHONE } from "@/data/legal";
import { useI18n } from "@/context/I18nContext";

export function InfoModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-info-title"
        className="legal-modal max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id="trust-info-title" className="text-base font-extrabold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-elev"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="legal-modal-scroll px-4 py-5 text-sm leading-relaxed text-soft">{children}</div>
      </div>
    </div>
  );
}

const SUPPORT_KEYS = ["sup.r1", "sup.r2", "sup.r3", "sup.r4"] as const;

export function SupportChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<{ from: "me" | "bot"; text: string }[]>([]);
  const idx = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: "bot", text: t("sup.hello") }]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing, open]);

  function send() {
    const msg = text.trim();
    if (!msg || typing) return;
    setMessages((m) => [...m, { from: "me", text: msg }]);
    setText("");
    setTyping(true);
    window.setTimeout(() => {
      const reply = t(SUPPORT_KEYS[idx.current % SUPPORT_KEYS.length]);
      idx.current += 1;
      setMessages((m) => [...m, { from: "bot", text: reply }]);
      setTyping(false);
    }, 700);
  }

  if (!open) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        className="legal-modal max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 id="support-title" className="text-base font-extrabold">
              {t("sup.h")}
            </h2>
            <p className="text-[11px] text-lime">{t("sup.online")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-elev"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div ref={scroller} className="legal-modal-scroll max-h-[42vh] space-y-2 px-4 py-3">
          {messages.map((m, i) => (
            <p
              key={`${m.text}-${i}`}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "me" ? "bubble-me ml-auto" : "ml-0 bg-elev text-soft"
              }`}
            >
              {m.text}
            </p>
          ))}
          {typing && <p className="text-xs text-muted">{t("sup.typing")}</p>}
        </div>
        <div className="border-t border-line p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t("sup.ph")}
              className="h-11 flex-1 rounded-xl border border-line bg-panel px-3 text-sm"
            />
            <button type="button" onClick={send} className="btn-primary h-11 w-11 shrink-0">
              <Send className="relative z-10 h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            <a className="text-lime hover:underline" href={`tel:${LEGAL_PHONE.replace(/\s/g, "")}`}>
              {LEGAL_PHONE}
            </a>
            <a className="text-lime hover:underline" href={`mailto:${LEGAL_EMAIL_DESTEK}`}>
              {LEGAL_EMAIL_DESTEK}
            </a>
            <Link href="/kurumsal/iletisim" className="text-lime hover:underline" onClick={onClose}>
              {t("sup.page")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
