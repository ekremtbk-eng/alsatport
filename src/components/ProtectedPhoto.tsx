"use client";

function blockSave(e: { preventDefault(): void }) {
  e.preventDefault();
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
    <span className={`media-guard ${className}`} onContextMenu={blockSave} onDragStart={blockSave} onCopy={blockSave}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className={imgClassName} />
      <span className="media-guard-film" aria-hidden />
    </span>
  );
}
