"use client";

function blockSave(e: { preventDefault(): void; stopPropagation?: () => void }) {
  e.preventDefault();
  e.stopPropagation?.();
}

export function ProtectedPhoto({
  src,
  alt,
  className = "",
  imgClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <span
      className={`media-guard ${className}`}
      draggable={false}
      onContextMenu={blockSave}
      onDragStart={blockSave}
      onCopy={blockSave}
      onCut={blockSave}
      onAuxClick={blockSave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        onContextMenu={blockSave}
        onDragStart={blockSave}
        className={imgClassName}
      />
      <span className="media-guard-film" aria-hidden />
    </span>
  );
}
