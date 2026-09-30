"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { apiUpload } from "@/lib/security/client";
import { isUsableListingImage } from "@/lib/listingMedia";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";
const MAX_MB = 2;

export function AvatarUploader() {
  const { user, refreshSession } = useApp();
  const { t } = useI18n();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  if (!user) return null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setHint("");
    const okType = /image\/(jpeg|jpg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!okType) {
      setError(t("photo.only"));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(t("photo.avatar.mb"));
      return;
    }
    setBusy(true);
    const res = await apiUpload<{ ok?: boolean; error?: string; url?: string }>("/api/account/avatar", file);
    setBusy(false);
    if (!res.ok || !res.url || !isUsableListingImage(res.url)) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setHint(t("photo.avatar.ok"));
    await refreshSession();
  }

  return (
    <div className="dash-avatar-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.avatar || ""} alt="" className="dash-avatar" />
      <p className="mt-2 text-[11px] text-muted">{t("photo.avatar.hint")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="btn-ghost inline-flex h-9 items-center gap-1 px-3 text-xs"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {busy ? t("common.loading") : t("photo.gallery")}
        </button>
        <button
          type="button"
          className="btn-ghost inline-flex h-9 items-center gap-1 px-3 text-xs"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5" />
          {t("photo.camera")}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-orange">{error}</p> : null}
      {hint ? <p className="mt-2 text-xs font-semibold text-lime">{hint}</p> : null}
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="user"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
