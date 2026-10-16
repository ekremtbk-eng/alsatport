"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/context/AppContext";
import { AuthModal } from "@/components/AuthModal";
import { currentReturnPath } from "@/lib/profile";

export type AuthModalReason = "search" | "filter" | "member" | "login";

type AuthModalState = {
  open: boolean;
  signupOpen: boolean;
  reason: AuthModalReason;
  /** Safe same-origin path captured when the modal opened (header Giriş / Üye Ol). */
  returnTo: string | null;
  openAuth: (reason?: AuthModalReason) => void;
  closeAuth: () => void;
  openRegister: () => void;
  closeRegister: () => void;
  requireAuth: (reason?: AuthModalReason) => boolean;
};

const Ctx = createContext<AuthModalState | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { user, hydrated } = useApp();
  const [open, setOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [reason, setReason] = useState<AuthModalReason>("login");
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const captureReturn = useCallback(() => {
    setReturnTo(currentReturnPath());
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
    setReturnTo(null);
  }, []);
  const closeRegister = useCallback(() => {
    setSignupOpen(false);
    setReturnTo(null);
  }, []);

  const openAuth = useCallback(
    (next: AuthModalReason = "login") => {
      captureReturn();
      setSignupOpen(false);
      setReason(next);
      setOpen(true);
    },
    [captureReturn],
  );

  const openRegister = useCallback(() => {
    captureReturn();
    setOpen(false);
    setSignupOpen(true);
  }, [captureReturn]);

  const requireAuth = useCallback(
    (next: AuthModalReason = "member") => {
      if (!hydrated) return false;
      if (user) return true;
      openAuth(next);
      return false;
    },
    [hydrated, user, openAuth],
  );

  const value = useMemo(
    () => ({
      open,
      signupOpen,
      reason,
      returnTo,
      openAuth,
      closeAuth,
      openRegister,
      closeRegister,
      requireAuth,
    }),
    [open, signupOpen, reason, returnTo, openAuth, closeAuth, openRegister, closeRegister, requireAuth],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <AuthModal />
    </Ctx.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
