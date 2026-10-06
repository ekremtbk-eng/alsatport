"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, ImagePlus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";
import { moderateListingMaterial } from "@/lib/liveAnimalPolicy";
import { apiGet, apiPut, apiUpload } from "@/lib/security/client";

const MAX_MB = 6;

type Info = { listingId: string; title: string; categoryId: string; images: number; max: number };

function QrPhoto() {
  const { user } = useApp();
  const { t } = useI18n();
  const token = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
      setError("qr.err.invalid");
      return;
    }
    const res = await apiGet<{ ok: boolean; error?: string } & Partial<Info>>(`/api/qr/photo?t=${encodeURIComponent(token)}`).catch(
      () => null,
    );
    if (!res?.ok || !res.listingId) {
      setError(res?.error ?? "qr.err.expired");
      return;
    }
    setInfo({ listingId: res.listingId, title: res.title ?? "", categoryId: res.categoryId ?? "", images: res.images ?? 0, max: res.max ?? 16 });
  }, [token]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function upload(files: FileList | null) {
    if (!files?.length || !info) return;
    setError("");
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    const blocked = list.map((f) => moderateListingMaterial(f, info.categoryId)).find((x) => x.blocked);
    if (blocked) {
      setError(blocked.reason ?? "mod.animal");
      return;
    }
    const room = info.max - info.images;
    if (room <= 0) {
      setError("qr.err.full");
      return;
    }
    setBusy(true);
    let count = info.images;
    let ok = 0;
    for (const [i, file] of list.slice(0, room).entries()) {
      setProgress(t("qr.photo.uploading").replace("{i}", String(i + 1)).replace("{n}", String(Math.min(list.length, room))));
      if (file.size > MAX_MB * 1024 * 1024) {
        setError("photo.mb");
        continue;
      }
      const up = await apiUpload<{ ok?: boolean; error?: string; url?: string }>("/api/uploads", file, { categoryId: info.categoryId });
      if (!up.ok || !up.url || !isAllowedListingImageUrl(up.url)) {
        setError(up.error ?? "auth.err.server");
        continue;
      }
      const res = await apiPut<{ ok: boolean; error?: string; images?: number }>("/api/qr/photo", { t: token, url: up.url });
      if (!res.ok) {
        setError(res.error ?? "auth.err.server");
        if (res.error === "qr.err.expired" || res.error === "qr.err.full") break;
        continue;
      }
      count = res.images ?? count + 1;
      ok += 1;
    }
    setInfo({ ...info, images: count });
    setAdded((n) => n + ok);
    setProgress("");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <h1 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
        <ImagePlus className="h-5 w-5 text-lime" aria-hidden /> {t("acct.qr.photo.h")}
      </h1>
      {!info ? (
        <p className="mt-3 text-sm font-semibold text-orange">{error ? t(error) : t("auth.connecting")}</p>
      ) : (
        <>
          <p className="mb-3 truncate text-sm text-muted">{info.title}</p>
          <p className="mb-3 text-sm font-semibold">
            {t("acct.qr.photo.count").replace("{n}", String(info.images)).replace("{max}", String(info.max))}
          </p>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void upload(e.target.files)} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-primary h-12"
              disabled={busy || info.images >= info.max}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden /> {t("qr.photo.camera")}
            </button>
            <button
              type="button"
              className="chip h-12 justify-center"
              disabled={busy || info.images >= info.max}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" aria-hidden /> {t("qr.photo.gallery")}
            </button>
          </div>
          {progress ? <p className="mt-3 text-xs text-muted">{progress}</p> : null}
          {added > 0 && !busy ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-lime">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> {t("qr.photo.added").replace("{n}", String(added))}
            </p>
          ) : null}
          {error ? <p className="mt-3 text-xs font-semibold text-orange">{t(error, { n: MAX_MB })}</p> : null}
          <p className="mt-4 text-[11px] text-muted">{t("qr.photo.note")}</p>
        </>
      )}
      <Link href="/" className="dash-link mt-4 inline-block text-sm">
        {t("auth.gate.home")}
      </Link>
    </div>
  );
}

export default function QrPhotoPage() {
  return (
    <Suspense fallback={null}>
      <QrPhoto />
    </Suspense>
  );
}
