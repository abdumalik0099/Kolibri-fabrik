import React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

export default function BlurUpImage(props: {
  src: string;
  thumbSrc?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const { src, thumbSrc, alt, className, imgClassName, loading = "lazy" } = props;
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // ✅ FIX: cache'dan kelgan rasm onLoad ni ishga tushirmaydi - qo'lda tekshiramiz
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-charcoal", className)}>
      {/* ✅ FIX: thumbSrc faqat dekorativ fon - asosiy rasm DOIM ko'rinadi */}
      {thumbSrc && !loaded ? (
        <img
          src={thumbSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover blur-xl scale-110"
          loading="eager"
          decoding="async"
        />
      ) : null}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        // ✅ FIX: opacity-0 YO'Q - rasm DOIM ko'rinadi, faqat thumb ustida chiqadi
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-500",
          "opacity-100",
          imgClassName
        )}
      />
    </div>
  );
}