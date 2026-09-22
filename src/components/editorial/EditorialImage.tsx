"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { fallbackUrl, srcset, type PhotoView } from "@/lib/photos/view";
import type { Aspect, ImageSlot } from "@/lib/blocks/schema";

const ASPECT_VALUE: Record<Aspect, string | null> = {
  auto: null,
  "1:1": "1 / 1",
  "4:5": "4 / 5",
  "5:4": "5 / 4",
  "3:2": "3 / 2",
  "2:3": "2 / 3",
  "4:3": "4 / 3",
  "3:4": "3 / 4",
  "16:9": "16 / 9",
  "21:9": "21 / 9",
  "2:1": "2 / 1",
  "3:1": "3 / 1",
};

export function sizesFor(span: number) {
  const pct = Math.round((span / 12) * 100);
  return `(max-width: 639px) ${span <= 4 ? 50 : 100}vw, (max-width: 1023px) ${Math.min(100, Math.round(pct * 1.15))}vw, ${pct}vw`;
}

export function EditorialImage({
  photo,
  slot,
  priority,
  onClick,
  className,
}: {
  photo: PhotoView;
  slot: Pick<ImageSlot, "fit" | "aspect" | "rotation" | "scale" | "focal" | "span">;
  priority?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Images that finished loading before hydration never fire onLoad.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [photo.id]);
  const aspect = ASPECT_VALUE[slot.aspect];
  const fx = slot.focal?.x ?? photo.focalX;
  const fy = slot.focal?.y ?? photo.focalY;
  const style: CSSProperties & Record<string, string> = {
    "--fit": aspect ? slot.fit : "contain",
    "--focal-x": `${Math.round(fx * 100)}%`,
    "--focal-y": `${Math.round(fy * 100)}%`,
    "--rot": `${slot.rotation}deg`,
    "--scale": String(slot.scale),
    "--lqip-color": photo.dominantColor,
  };
  if (aspect) style["--aspect"] = aspect;
  else style.aspectRatio = `${photo.width} / ${photo.height}`;

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`ed-media ${onClick ? "cursor-zoom-in" : ""} ${className ?? ""}`}
      data-aspect={aspect ? "" : undefined}
      data-loaded={loaded ? "true" : "false"}
      style={style}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={onClick ? `Open ${photo.title || photo.alt || "photograph"} full screen` : undefined}
    >
      {photo.lqip ? <span className="ed-lqip" style={{ backgroundImage: `url(${photo.lqip})` }} /> : null}
      <picture>
        {photo.sources.avif.length ? <source type="image/avif" srcSet={srcset(photo.sources.avif)} sizes={sizesFor(slot.span)} /> : null}
        {photo.sources.webp.length ? <source type="image/webp" srcSet={srcset(photo.sources.webp)} sizes={sizesFor(slot.span)} /> : null}
        <img
          ref={imgRef}
          src={fallbackUrl(photo)}
          srcSet={photo.sources.jpeg.length ? srcset(photo.sources.jpeg) : undefined}
          sizes={sizesFor(slot.span)}
          alt={photo.alt || photo.title || ""}
          width={photo.width}
          height={photo.height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          draggable={false}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0.001 }}
        />
      </picture>
    </Tag>
  );
}
