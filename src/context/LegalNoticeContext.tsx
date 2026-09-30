"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LegalNoticeState = {
  legalOpen: boolean;
  openLegal: () => void;
  closeLegal: () => void;
};

const LegalNoticeContext = createContext<LegalNoticeState | null>(null);

export function LegalNoticeProvider({ children }: { children: ReactNode }) {
  const [legalOpen, setLegalOpen] = useState(false);
  const openLegal = useCallback(() => setLegalOpen(true), []);
  const closeLegal = useCallback(() => setLegalOpen(false), []);

  useEffect(() => {
    if (!legalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLegalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [legalOpen]);

  const value = useMemo(
    () => ({ legalOpen, openLegal, closeLegal }),
    [legalOpen, openLegal, closeLegal],
  );

  return <LegalNoticeContext.Provider value={value}>{children}</LegalNoticeContext.Provider>;
}

export function useLegalNotice() {
  const ctx = useContext(LegalNoticeContext);
  if (!ctx) throw new Error("useLegalNotice");
  return ctx;
}
