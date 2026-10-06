"use client";

import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Star, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { moderateListingMaterial } from "@/lib/liveAnimalPolicy";
import { apiDelete, apiUpload } from "@/lib/security/client";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";

export const MIN_PHOTOS = 1;
const MAX_MB = 6;
const MAX_PHOTOS = 16;

function storageKeyFromUrl(url: string) {
  if (url.startsWith("/api/media/")) {
    return url
      .slice("/api/media/".length)
      .split("/")
      .filter(Boolean)
      .map((p) => decodeURIComponent(p))
      .join("/");
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("blob.vercel-storage.com")) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function PhotoUploader({
  images,
  onChange,
  note,
  categoryId = "",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  note?: string;
  categoryId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fromRef = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const animalHit = incoming
      .map((f) => ({ f, hit: moderateListingMaterial(f, categoryId) }))
      .find((x) => x.hit.blocked);
    if (animalHit) {
      setError(t(animalHit.hit.reason ?? "mod.animal.video"));
      return;
    }
    const list = incoming.filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      setError(t("photo.only"));
      return;
    }
    const room = Math.max(0, MAX_PHOTOS - images.length);
    const oversized = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const ok = list.filter((f) => f.size <= MAX_MB * 1024 * 1024).slice(0, room);
    if (!ok.length) {
      setError(t("photo.mb", { n: MAX_MB }));
      return;
    }
    setBusy(true);
    const uploaded: string[] = [];
    let fail = "";
    for (const file of ok) {
      const res = await apiUpload<{ ok?: boolean; error?: string; url?: string }>(
        "/api/uploads",
        file,
        categoryId ? { categoryId } : undefined,
      );
      if (!res.ok || !res.url || !isAllowedListingImageUrl(res.url)) {
        fail = t(res.error === "photo.mb" ? "photo.mb" : res.error === "photo.only" ? "photo.only" : "auth.err.session");
        continue;
      }
      uploaded.push(res.url);
    }
    onChange([...images, ...uploaded]);
    setBusy(false);
    if (fail) setError(fail);
    else setError(oversized.length ? t("photo.mbSkip", { n: oversized.length, mb: MAX_MB }) : "");
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function setCover(i: number) {
    if (i <= 0) return;
    const next = [...images];
    const [item] = next.splice(i, 1);
    onChange([item, ...next]);
  }

  function removeAt(i: number) {
    const url = images[i];
    const key = storageKeyFromUrl(url);
    if (key) void apiDelete(`/api/uploads?key=${encodeURIComponent(key)}`);
    onChange(images.filter((_, idx) => idx !== i));
    setError("");
  }

  return (
    <div className="space-y-3">
      <div
        className={`dropzone flex flex-col items-center justify-center rounded-2xl px-4 py-10 cursor-pointer ${
          drag ? "dropzone-active" : ""
        }`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        <span className="btn-primary mb-3 grid h-12 w-12 !rounded-2xl">
          <ImagePlus className="relative z-10 h-6 w-6" />
        </span>
        <p className="text-sm font-semibold">{t("photo.drop")}</p>
        <p className="mt-1 text-xs text-muted">{t("photo.metaFree", { min: MIN_PHOTOS, mb: MAX_MB })}</p>
        {note ? <p className="mt-1 max-w-md text-center text-xs font-semibold text-lime">{note}</p> : null}
        <p className="mt-1 text-xs font-bold text-lime">
          {busy ? t("common.loading") : t("photo.loadedN", { n: images.length })}
        </p>
        <span className="btn-outline mt-4 h-10 px-4 text-sm">{t("photo.pick")}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-xs text-orange">{error}</p> : null}
      {images.length > 0 ? (
        <>
          <p className="text-[11px] text-muted">{t("photo.reorderHint")}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((src, i) => (
              <div
                key={`${i}-${src.slice(-24)}`}
                draggable
                onDragStart={() => {
                  fromRef.current = i;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (fromRef.current != null) move(fromRef.current, i);
                  fromRef.current = null;
                  setOver(null);
                }}
                onDragEnd={() => {
                  fromRef.current = null;
                  setOver(null);
                }}
                className={`photo-tile relative overflow-hidden rounded-xl ${over === i ? "is-over" : ""} ${
                  i === 0 ? "is-cover" : ""
                }`}
              >
                <span className="photo-tile-grip" aria-hidden>
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Önizleme ${i + 1}`} className="h-24 w-full object-cover" />
                {i === 0 ? (
                  <span className="badge-blue absolute start-1 bottom-1 rounded px-1.5 py-0.5 text-[10px]">
                    {t("photo.cover")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="photo-tile-cover"
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCover(i);
                    }}
                  >
                    <Star className="h-3 w-3" />
                    {t("photo.makeCover")}
                  </button>
                )}
                <button
                  type="button"
                  draggable={false}
                  className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  aria-label={t("photo.remove")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
