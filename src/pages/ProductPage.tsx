import React from "react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getProduct, getProductImageUrl, getProductVideoUrl, Product } from "../lib/products";
import BlurUpImage from "../components/BlurUpImage";
import { getProductGalleryPage, ProductGalleryItem } from "../lib/productGallery";
import type { DocumentSnapshot } from "firebase/firestore";
import logoPlaceholder from "../assets/logo.png";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string>("");

  const [galleryItems, setGalleryItems] = useState<ProductGalleryItem[]>([]);
  const [galleryCursor, setGalleryCursor] = useState<DocumentSnapshot | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryHasMore, setGalleryHasMore] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setGalleryItems([]);
      setGalleryCursor(null);
      setGalleryHasMore(false);

      Promise.all([
        getProduct(id).then(setProduct),
        (async () => {
          setGalleryLoading(true);
          try {
            const res = await getProductGalleryPage({ productId: id, pageSize: 12, cursor: null });
            setGalleryItems(res.items);
            setGalleryCursor(res.nextCursor);
            setGalleryHasMore(Boolean(res.nextCursor));
          } finally {
            setGalleryLoading(false);
          }
        })(),
      ])
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    setSelectedImage(getProductImageUrl(product || {}) || "");
  }, [product]);

  // Lightbox ochiq bo'lsa scroll o'chirish
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % allMedia.length);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + allMedia.length) % allMedia.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  async function loadMoreGallery() {
    if (!id || galleryLoading || !galleryHasMore) return;
    setGalleryLoading(true);
    try {
      const res = await getProductGalleryPage({ productId: id, pageSize: 12, cursor: galleryCursor });
      setGalleryItems((prev) => [...prev, ...res.items]);
      setGalleryCursor(res.nextCursor);
      setGalleryHasMore(Boolean(res.nextCursor));
    } catch (err) {
      console.error(err);
    } finally {
      setGalleryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <h1 className="font-heading text-3xl">Mahsulot topilmadi</h1>
          <Link to="/katalog" className="text-gold mt-4 inline-block">Katalogga qaytish</Link>
        </div>
      </div>
    );
  }

  const productImageUrl = getProductImageUrl(product);
  const productVideoUrl = getProductVideoUrl(product);

  const gallerySources = galleryItems
    .map((it) => (it as unknown as { srcUrl?: string }).srcUrl || "")
    .filter(Boolean)
    .filter((src) => src !== productImageUrl);

  const mainImage = selectedImage || productImageUrl || gallerySources[0] || "";

  // Barcha media (rasm + gallery) lightbox uchun
  // Video birinchi o'rinda bo'lsa uni ham qo'shamiz
  type MediaItem = { type: "image"; src: string } | { type: "video"; src: string };
  const allMedia: MediaItem[] = [
    ...(productVideoUrl ? [{ type: "video" as const, src: productVideoUrl }] : []),
    ...([productImageUrl, ...gallerySources].filter(Boolean).map((src) => ({
      type: "image" as const,
      src: src!,
    }))),
  ];

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // Thumbnail bosish: rasm uchun selectedImage + lightbox index
  function handleThumbClick(src: string, thumbIdx: number) {
    setSelectedImage(src);
    // lightbox index: video bo'lsa +1 offset
    const offset = productVideoUrl ? 1 : 0;
    setLightboxIndex(offset + thumbIdx);
  }

  const currentMedia = allMedia[lightboxIndex];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="container mx-auto px-6">
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Katalogga qaytish
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Asosiy media */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Asosiy ko'rsatish maydoni */}
              <div
                className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-muted cursor-pointer"
                onClick={() => {
                  // Video bo'lsa index=0, rasm bo'lsa tegishli index
                  if (productVideoUrl) {
                    openLightbox(0);
                  } else {
                    const idx = [productImageUrl, ...gallerySources].filter(Boolean).findIndex((s) => s === mainImage);
                    openLightbox(Math.max(0, idx));
                  }
                }}
              >
                {productVideoUrl ? (
  // ✅ Video - hover effekti YO'Q, bosish = lightbox
  <video
    src={productVideoUrl}
    muted
    loop
    autoPlay
    playsInline
    preload="metadata"
    /* Yangi qo'shilgan sozlamalar 👇 */
    controlsList="nodownload noplaybackrate"
    disablePictureInPicture
    onContextMenu={(e) => e.preventDefault()}
    className="w-full h-full object-cover"
  />
) : (
                  <img
                    src={mainImage || logoPlaceholder}
                    alt={product.title}
                    loading="eager"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = logoPlaceholder; }}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                )}
                {/* Kattalashtirish belgisi */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full p-3">
                    <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Thumbnaillar */}
              {(productImageUrl || gallerySources.length > 0) && (
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {/* Video thumbnail */}
                  {productVideoUrl && (
                    <button
                      type="button"
                      className="rounded-lg overflow-hidden border border-gold/10 hover:border-gold/30 transition bg-charcoal/30 relative"
                      onClick={() => openLightbox(0)}
                    >
                      <div className="aspect-square flex items-center justify-center bg-charcoal/60">
                        <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Rasm thumbnaillar */}
                  {[productImageUrl, ...gallerySources].filter(Boolean).slice(0, 11).map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      className={`rounded-lg overflow-hidden border transition bg-charcoal/30 ${
                        src === mainImage ? "border-gold/60" : "border-gold/10 hover:border-gold/30"
                      }`}
                      onClick={() => handleThumbClick(src!, idx)}
                    >
                      <BlurUpImage
                        src={src || ""}
                        alt="Gallery thumb"
                        className="aspect-square"
                        imgClassName="object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              {galleryHasMore && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void loadMoreGallery()}
                    disabled={galleryLoading}
                    className="w-full rounded-xl border border-gold/15 bg-charcoal/40 px-4 py-3 text-xs tracking-wider uppercase text-cream/70 hover:text-cream hover:border-gold/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {galleryLoading && <Loader2 size={14} className="animate-spin" />}
                    Yana rasmlar
                  </button>
                </div>
              )}
            </motion.div>

            {/* Ma'lumotlar */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:sticky lg:top-28"
            >
              <span className="text-sm tracking-[0.2em] uppercase text-gold font-medium">
                {product.category}
              </span>
              <h1 className="font-heading text-4xl md:text-5xl font-semibold mt-3">
                {product.title}
              </h1>
              <div className="border-t border-border mt-8 pt-8">
                <h3 className="font-heading text-lg font-semibold mb-3">Tavsif</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || "Premium sifatli parda. Har qanday interyer uchun mos."}
                </p>
              </div>
              <a
                href="tel:+998901234567"
                className="inline-flex items-center gap-3 mt-8 bg-gold-gradient text-charcoal px-8 py-4 rounded-full font-medium text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-gold/20 transition-all duration-500"
              >
                Buyurtma berish
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ✅ LIGHTBOX - to'liq ekran */}
      <AnimatePresence>
        {lightboxOpen && currentMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Yopish tugmasi */}
            <button
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            >
              <X size={24} />
            </button>

            {/* Oldingi */}
            {allMedia.length > 1 && (
              <button
                className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i - 1 + allMedia.length) % allMedia.length);
                }}
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Keyingi */}
            {allMedia.length > 1 && (
              <button
                className="absolute right-16 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % allMedia.length);
                }}
              >
                <ChevronRight size={28} />
              </button>
            )}

            {/* Media */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {currentMedia.type === "video" ? (
  <video
    src={currentMedia.src}
    autoPlay
    playsInline
    controlsList="nodownload noplaybackrate"
    disablePictureInPicture
    onContextMenu={(e) => e.preventDefault()}
    className="max-w-[90vw] max-h-[90vh] rounded-xl cursor-pointer select-none"
    
    /* Foydalanuvchi bosganda */
    onPointerDown={(e) => {
      e.stopPropagation();
      const videoEl = e.currentTarget;
      
      const rect = videoEl.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      
      // 300ms ushlab tursa, uzoq bosish boshlanadi
      const longPressTimer = setTimeout(() => {
        videoEl.dataset.isLongPress = "true";
        
        if (clickX > width / 2) {
          // 👉 O'NG TOMON: Oldinga 1.7x tezlik (ovoz chiroyli tezlashadi)
          videoEl.playbackRate = 1.7;
          videoEl.muted = false; 
        } else {
          // 👈 CHAP TOMON: Videoni orqaga qaytarish (Revers)
          videoEl.pause();
          
          if (videoEl.dataset.reverseIntervalId) {
            clearInterval(Number(videoEl.dataset.reverseIntervalId));
          }

          // 🔇 Orqaga qaytayotganda ovozni o'chirib turamiz (shovqin va g'o'ldirash bo'lmasligi uchun)
          videoEl.muted = true;

          const reverseInterval = setInterval(() => {
            if (videoEl.currentTime > 0.1) {
              videoEl.currentTime -= 0.1;
            } else {
              videoEl.currentTime = 0;
              clearInterval(reverseInterval);
            }
          }, 50);
          
          videoEl.dataset.reverseIntervalId = String(reverseInterval);
        }
      }, 300);

      videoEl.dataset.longPressTimer = String(longPressTimer);
      videoEl.dataset.isLongPress = "false";
    }}

    /* Qo'yib yuborganda */
    onPointerUp={(e) => {
      e.stopPropagation();
      const videoEl = e.currentTarget;
      
      const timer = videoEl.dataset.longPressTimer;
      if (timer) clearTimeout(Number(timer));
      
      const reverseIntervalId = videoEl.dataset.reverseIntervalId;
      if (reverseIntervalId) {
        clearInterval(Number(reverseIntervalId));
        videoEl.dataset.reverseIntervalId = "";
      }
      
      const isLongPress = videoEl.dataset.isLongPress === "true";
      
      // Qo'yib yuborishi bilan tezlikni 1x qilamiz va ovozni darhol yoqamiz (Unmute)
      videoEl.playbackRate = 1.0;
      videoEl.muted = false;

      if (isLongPress) {
        videoEl.play().catch(console.error);
      } else {
        // Shunchaki bir marta bosganda Play/Pause (ovoz bilan)
        if (videoEl.paused) {
          videoEl.play().catch(console.error);
        } else {
          videoEl.pause();
        }
      }
    }}

    /* Kursor yoki barmoq chetga chiqib ketsa, hammasini tiklaymiz */
    onPointerLeave={(e) => {
      const videoEl = e.currentTarget;
      
      const timer = videoEl.dataset.longPressTimer;
      if (timer) clearTimeout(Number(timer));
      
      const reverseIntervalId = videoEl.dataset.reverseIntervalId;
      if (reverseIntervalId) {
        clearInterval(Number(reverseIntervalId));
        videoEl.dataset.reverseIntervalId = "";
      }
      
      videoEl.playbackRate = 1.0;
      videoEl.muted = false; // Ovozni yoqish
      videoEl.play().catch(console.error);
    }}
  />
) : (
                <img
                  src={currentMedia.src}
                  alt={product.title}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
                  onError={(e) => { e.currentTarget.src = logoPlaceholder; }}
                />
              )}
            </motion.div>

            {/* Sahifa ko'rsatkichi */}
            {allMedia.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allMedia.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`w-2 h-2 rounded-full transition ${i === lightboxIndex ? "bg-white" : "bg-white/30"}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}