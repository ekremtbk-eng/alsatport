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

export type AuthModalReason = "search" | "filter" | "member" | "login";

type AuthModalState = {
  open: boolean;
  signupOpen: boolean;
  reason: AuthModalReason;
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

  const closeAuth = useCallback(() => setOpen(false), []);
  const closeRegister = useCallback(() => setSignupOpen(false), []);

  const openAuth = useCallback((next: AuthModalReason = "login") => {
    setSignupOpen(false);
    setReason(next);
    setOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setOpen(false);
    setSignupOpen(true);
  }, []);

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
      openAuth,
      closeAuth,
      openRegister,
      closeRegister,
      requireAuth,
    }),
    [open, signupOpen, reason, openAuth, closeAuth, openRegister, closeRegister, requireAuth],
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
