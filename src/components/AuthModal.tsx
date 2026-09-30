"use client";

import { useEffect } from "react";
import { AuthStage, type AuthTab } from "@/components/AuthStage";
import { useAuthModal } from "@/context/AuthModalContext";

export function AuthModal() {
  const { open, signupOpen, reason, closeAuth, closeRegister, openAuth, openRegister } = useAuthModal();
  const visible = open || signupOpen;
  const tab: AuthTab = signupOpen ? "signup" : "login";

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAuth();
        closeRegister();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, closeAuth, closeRegister]);

  if (!visible) return null;

  return (
    <AuthStage
      tab={tab}
      variant="overlay"
      promptKey={reason === "login" ? "auth.modal.join" : `auth.modal.${reason}`}
      onTab={(next) => {
        if (next === "signup") openRegister();
        else openAuth("login");
      }}
      onClose={() => {
        closeAuth();
        closeRegister();
      }}
    />
  );
}
