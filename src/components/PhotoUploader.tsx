"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Plus, RotateCcw, Star, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { useDevice } from "@/context/DeviceContext";
import { moderateListingMaterial } from "@/lib/liveAnimalPolicy";
import { apiDelete, apiUploadWithProgress } from "@/lib/security/client";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";
import { UPLOAD_ACCEPT, looksLikeImage, prepareListingPhoto, type PrepError } from "@/lib/imagePrep";

export const MIN_PHOTOS = 1;
const MAX_MB = 6;
export const MAX_PHOTOS = 16;

type Pending = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  state: "queued" | "uploading" | "failed";
  error?: string;
};

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
  onBusyChange,
}: {
  images: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  note?: string;
  categoryId?: string;
  /** True while any photo is still waiting or uploading. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const { isTouch } = useDevice();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const chain = useRef<Promise<void>>(Promise.resolve());
  /** Only objects uploaded on this page are deleted from storage; a saved listing's photo is only unlinked. */
  const uploadedHere = useRef(new Set<string>());
  const fromRef = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const busy = pending.some((p) => p.state !== "failed");
  const room = Math.max(0, MAX_PHOTOS - images.length - pending.length);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      for (const p of pendingRef.current) URL.revokeObjectURL(p.preview);
    },
    [],
  );

  const patch = (id: string, next: Partial<Pending>) =>
    setPending((list) => list.map((p) => (p.id === id ? { ...p, ...next } : p)));

  function uploadError(code: string | undefined, status: number) {
    if (code === "photo.mb") return t("photo.mb", { n: MAX_MB });
    if (code === "photo.only") return t("photo.only");
    if (code === "photo.err.heic") return t("photo.err.heic");
    if (code?.startsWith("mod.")) return t(code);
    if (code === "auth.err.rateLimit") return t("auth.err.rateLimit");
    if (code === "photo.err.network") return t("photo.err.network");
    if (status === 401 || code === "auth.err.session") return t("auth.err.session");
    return t("photo.err.upload");
  }

  async function uploadOne(item: Pending) {
    patch(item.id, { state: "uploading", progress: 0, error: undefined });
    const res = await apiUploadWithProgress<{ ok?: boolean; error?: string; url?: string }>(
      "/api/uploads",
      item.file,
      categoryId ? { categoryId } : undefined,
      (progress) => patch(item.id, { progress }),
    );
    if (!res.ok || !res.url || !isAllowedListingImageUrl(res.url)) {
      patch(item.id, { state: "failed", error: uploadError(res.error, res.status) });
      return;
    }
    const url = res.url;
    uploadedHere.current.add(url);
    onChange((prev) => (prev.length >= MAX_PHOTOS || prev.includes(url) ? prev : [...prev, url]));
    URL.revokeObjectURL(item.preview);
    setPending((list) => list.filter((p) => p.id !== item.id));
  }

  function enqueue(item: Pending) {
    chain.current = chain.current.then(() => uploadOne(item)).catch(() => undefined);
  }

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    if (!incoming.length) return;
    const animalHit = incoming
      .map((f) => ({ f, hit: moderateListingMaterial(f, categoryId) }))
      .find((x) => x.hit.blocked);
    if (animalHit) {
      setError(t(animalHit.hit.reason ?? "mod.animal.video"));
      return;
    }
    const images_ = incoming.filter(looksLikeImage);
    const problems: string[] = [];
    if (images_.length < incoming.length) problems.push(t("photo.only"));
    if (!room) {
      setError(t("photo.full", { max: MAX_PHOTOS }));
      return;
    }
    if (images_.length > room) problems.push(t("photo.full", { max: MAX_PHOTOS }));
    const failures = new Map<PrepError, number>();
    for (const file of images_.slice(0, room)) {
      const ready = await prepareListingPhoto(file);
      if ("error" in ready) {
        failures.set(ready.error, (failures.get(ready.error) ?? 0) + 1);
        continue;
      }
      const item: Pending = {
        id: crypto.randomUUID(),
        file: ready.file,
        preview: URL.createObjectURL(ready.file),
        progress: 0,
        state: "queued",
      };
      setPending((list) => [...list, item]);
      enqueue(item);
    }
    if (failures.get("type")) problems.push(t("photo.only"));
    if (failures.get("heic")) problems.push(t("photo.err.heic"));
    if (failures.get("size")) problems.push(t("photo.mb", { n: MAX_MB }));
    setError([...new Set(problems)].join(" "));
  }

  function retry(id: string) {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    patch(id, { state: "queued", progress: 0, error: undefined });
    enqueue({ ...item, state: "queued" });
  }

  function dropPending(id: string) {
    setPending((list) => {
      const hit = list.find((p) => p.id === id);
      if (hit) URL.revokeObjectURL(hit.preview);
      return list.filter((p) => p.id !== id);
    });
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function setCover(i: number) {
    if (i <= 0) return;
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(i, 1);
      return [item, ...next];
    });
  }

  function removeAt(i: number) {
    const url = images[i];
    if (uploadedHere.current.has(url)) {
      const key = storageKeyFromUrl(url);
      if (key) void apiDelete(`/api/uploads?key=${encodeURIComponent(key)}`);
      uploadedHere.current.delete(url);
    }
    onChange((prev) => prev.filter((u) => u !== url));
    setError("");
  }

  const pick = (input: HTMLInputElement | null) => {
    if (!room) {
      setError(t("photo.full", { max: MAX_PHOTOS }));
      return;
    }
    input?.click();
  };

  const fileInput = (ref: typeof galleryRef, camera: boolean) => (
    <input
      ref={ref}
      type="file"
      accept={camera ? "image/*" : UPLOAD_ACCEPT}
      {...(camera ? { capture: "environment" as const } : { multiple: true })}
      className="hidden"
      data-photo-input={camera ? "camera" : "gallery"}
      onChange={(e) => {
        if (e.target.files) void addFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="photo-up space-y-3">
      <div
        className={`photo-up-drop ${drag ? "is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
      >
        <div className="photo-up-actions">
          {isTouch ? (
            <button type="button" className="photo-up-btn" onClick={() => pick(cameraRef.current)}>
              <Camera className="h-5 w-5" aria-hidden />
              {t("photo.camera")}
            </button>
          ) : null}
          <button type="button" className="photo-up-btn is-main" onClick={() => pick(galleryRef.current)}>
            <ImagePlus className="h-5 w-5" aria-hidden />
            {isTouch ? t("photo.gallery") : t("photo.pick")}
          </button>
        </div>
        {!isTouch ? <p className="photo-up-dropnote">{t("photo.drop")}</p> : null}
        <p className="photo-up-meta">{t("photo.hintTypes", { mb: MAX_MB })}</p>
        {note ? <p className="photo-up-note">{note}</p> : null}
        {fileInput(galleryRef, false)}
        {fileInput(cameraRef, true)}
      </div>

      <div className="photo-up-count">
        <strong>{t("photo.countMax", { n: images.length, max: MAX_PHOTOS })}</strong>
        {busy ? <span>{t("photo.uploading")}</span> : null}
      </div>
      {error ? (
        <p className="photo-up-error" role="alert">
          {error}
        </p>
      ) : null}

      {images.length + pending.length > 0 ? (
        <>
          {images.length > 1 ? <p className="text-[11px] text-muted">{t("photo.coverHint")}</p> : null}
          <ul className="photo-grid">
            {images.map((src, i) => (
              <li
                key={src}
                draggable={!isTouch}
                data-photo-tile
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
                className={`photo-cell ${over === i ? "is-over" : ""} ${i === 0 ? "is-cover" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={t("photo.alt", { n: i + 1 })} draggable={false} />
                {i === 0 ? <span className="photo-cell-cover">{t("photo.cover")}</span> : null}
                <button type="button" className="photo-cell-x" onClick={() => removeAt(i)} aria-label={t("photo.remove")}>
                  <X className="h-4 w-4" />
                </button>
                <div className="photo-cell-tools">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t("photo.moveLeft")}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCover(i)}
                    disabled={i === 0}
                    aria-label={t("photo.makeCover")}
                    aria-pressed={i === 0}
                    className={i === 0 ? "is-on" : ""}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === images.length - 1}
                    aria-label={t("photo.moveRight")}
                  >
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </div>
              </li>
            ))}
            {pending.map((p) => (
              <li key={p.id} className={`photo-cell is-pending ${p.state === "failed" ? "is-failed" : ""}`} data-photo-pending={p.state}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" draggable={false} />
                {p.state === "failed" ? (
                  <div className="photo-cell-fail" role="alert">
                    <span>{p.error ?? t("photo.err.upload")}</span>
                    <div>
                      <button type="button" onClick={() => retry(p.id)} className="photo-cell-retry">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        {t("photo.retry")}
                      </button>
                      <button type="button" onClick={() => dropPending(p.id)} aria-label={t("photo.remove")} className="photo-cell-retry">
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="photo-cell-progress" aria-label={t("photo.uploading")}>
                    <span style={{ width: `${Math.round(p.progress * 100)}%` }} />
                    <em>{p.state === "queued" ? "…" : `%${Math.round(p.progress * 100)}`}</em>
                  </div>
                )}
              </li>
            ))}
            {room > 0 ? (
              <li className="photo-cell is-add">
                <button type="button" onClick={() => pick(galleryRef.current)} aria-label={t("photo.add")}>
                  <Plus className="h-7 w-7" aria-hidden />
                  <span>{t("photo.add")}</span>
                </button>
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </div>
  );
}
