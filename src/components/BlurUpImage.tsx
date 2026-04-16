import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-charcoal", className)}>
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full object-cover blur-xl scale-110 transition-opacity duration-300",
            loaded ? "opacity-0" : "opacity-100"
          )}
          loading="eager"
          decoding="async"
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : thumbSrc ? "opacity-0" : "opacity-100",
          imgClassName
        )}
      />
    </div>
  );
}

