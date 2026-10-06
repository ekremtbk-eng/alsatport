"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { ProtectedPhoto } from "@/components/ProtectedPhoto";
import { ListingLightbox } from "@/components/listing/ListingLightbox";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";

export function ListingGallery({
  images,
  alt,
  layout = "default",
}: {
  images: string[];
  alt: string;
  layout?: "default" | "classified";
}) {
  const { t } = useI18n();
  const { hydrated } = useApp();
  const { requireAuth } = useAuthModal();
  const [idx, setIdx] = useState(0);
  const [lb, setLb] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const n = images.length;
  const src = images[idx] ?? images[0];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n < 2) return;
      setIdx((i) => (i + dir + n) % n);
    },
    [n],
  );

  function openInspect() {
    if (!hydrated) return;
    if (!requireAuth("member")) return;
    setLb(true);
  }

  useEffect(() => {
    if (layout === "classified") return;
    const el = thumbRefs.current[idx];
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [idx, layout]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = Math.abs(e.clientY - startY.current);
    startX.current = null;
    if (n > 1 && Math.abs(dx) >= 48 && dy < Math.abs(dx)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) < 12 && dy < 12) openInspect();
  }

  function onPointerCancel() {
    startX.current = null;
  }

  const classified = layout === "classified";
  const pageSize = classified ? 5 : n;
  const page = classified ? Math.floor(idx / pageSize) : 0;
  const thumbs = classified ? images.slice(page * pageSize, page * pageSize + pageSize) : images;
  const pageCount = classified ? Math.max(1, Math.ceil(n / pageSize)) : 1;

  return (
    <div className={classified ? "classified-gal" : "detail-gal"}>
      <div
        className={classified ? "classified-gal-stage" : "detail-gal-stage"}
        tabIndex={0}
        aria-label={t("list.lb.open")}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onAuxClick={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openInspect();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden draggable={false} decoding="async" className="gal-backdrop" />
        <ProtectedPhoto src={src} alt={alt} imgClassName={classified ? "classified-gal-img" : "detail-gal-img"} />
        {n > 1 ? (
          <>
            <button
              type="button"
              className={`detail-gal-nav is-prev ${classified ? "is-solid" : ""}`}
              aria-label={t("list.gal.prev")}
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`detail-gal-nav is-next ${classified ? "is-solid" : ""}`}
              aria-label={t("list.gal.next")}
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <span className={classified ? "classified-gal-count" : "detail-gal-count"}>
          {idx + 1}/{n}
        </span>
        {classified ? (
          <button type="button" className="classified-gal-zoom" onClick={openInspect}>
            {t("list.bigPhoto")}
          </button>
        ) : null}
      </div>

      {n > 1 ? (
        <div className={classified ? "classified-thumbs-wrap" : undefined}>
          {classified && pageCount > 1 ? (
            <button
              type="button"
              className="classified-thumb-nav"
              aria-label={t("list.gal.prev")}
              disabled={page === 0}
              onClick={() => setIdx(Math.max(0, (page - 1) * pageSize))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        <div className={classified ? "classified-thumbs" : "detail-thumbs"}>
          {thumbs.map((thumb, i) => {
            const real = classified ? page * pageSize + i : i;
            return (
            <button
              key={`${thumb}-${real}`}
              type="button"
              ref={(node) => {
                thumbRefs.current[real] = node;
              }}
              onClick={() => setIdx(real)}
              className={`${classified ? "classified-thumb" : "detail-thumb"} ${real === idx ? "is-on" : ""}`}
              aria-current={real === idx ? true : undefined}
              aria-label={`${real + 1} / ${n}`}
            >
              <ProtectedPhoto src={thumb} alt="" imgClassName="h-full w-full object-cover" />
            </button>
            );
          })}
        </div>
          {classified && pageCount > 1 ? (
            <button
              type="button"
              className="classified-thumb-nav"
              aria-label={t("list.gal.next")}
              disabled={page >= pageCount - 1}
              onClick={() => setIdx(Math.min(n - 1, (page + 1) * pageSize))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <ListingLightbox
        images={images}
        alt={alt}
        index={idx}
        open={lb}
        onClose={() => setLb(false)}
        onIndex={setIdx}
      />
    </div>
  );
}
