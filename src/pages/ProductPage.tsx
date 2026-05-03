import React from "react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ZoomIn } from "lucide-react";
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
  const [zoomed, setZoomed] = useState(false);
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
    // Default large image should be the product card image the user clicked.
    setSelectedImage(getProductImageUrl(product || {}) || "");
  }, [product]);

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

  // Keep product.imageUrl as first/default image, then show gallery attachments.
  const productImageUrl = getProductImageUrl(product);
  const productVideoUrl = getProductVideoUrl(product);
  const gallerySources = galleryItems
    .map((it) => (it as unknown as { srcUrl?: string; dataUrl?: string }).srcUrl || (it as unknown as { dataUrl?: string }).dataUrl || "")
    .filter(Boolean)
    .filter((src) => src !== productImageUrl);
  const mainImage = selectedImage || productImageUrl || gallerySources[0] || "";

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
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative group"
            >
              <div
                className={`relative overflow-hidden rounded-2xl cursor-zoom-in ${
                  zoomed ? "fixed inset-0 z-50 bg-charcoal/90 flex items-center justify-center rounded-none cursor-zoom-out" : "aspect-[3/4]"
                }`}
                onClick={() => setZoomed(!zoomed)}
              >
                {productVideoUrl ? (
                  <video
                    src={productVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className={`object-cover transition-transform duration-500 ${
                      zoomed ? "max-h-screen max-w-screen" : "w-full h-full group-hover:scale-105"
                    }`}
                  />
                ) : (
                  <img
                    src={mainImage || logoPlaceholder}
                    alt={product.title}
                    loading="eager"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = logoPlaceholder; }}
                    className={`object-cover transition-transform duration-500 ${
                      zoomed ? "max-h-screen max-w-screen" : "w-full h-full group-hover:scale-105"
                    }`}
                  />
                )}
                {!zoomed && (
                  <div className="absolute top-4 right-4 bg-charcoal/50 backdrop-blur-sm text-cream rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={18} />
                  </div>
                )}
              </div>

              {/* Product main thumb first, then attached gallery thumbs */}
              {(productImageUrl || gallerySources.length > 0) && !zoomed && !productVideoUrl && (
  <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
    {[productImageUrl, ...gallerySources].filter(Boolean).slice(0, 12).map((src, idx) => {
      // DEBUG: Rasm linklarini tekshirish uchun
      console.log("Rasm linki:", src); 
      
      return (
        <button
          key={`${src}-${idx}`}
          type="button"
          className={`rounded-lg overflow-hidden border bg-charcoal/30 transition ${
            src === mainImage ? "border-gold/60" : "border-gold/10 hover:border-gold/30"
          }`}
          onClick={() => setSelectedImage(src || "")}
          title="Ko'rish"
        >
          <BlurUpImage
            src={src || ""}
            alt="Gallery thumb"
            className="aspect-square"
            imgClassName="object-cover"
            loading="lazy"
          />
        </button>
      );
    })}
  </div>
)}

              {galleryHasMore && !zoomed && (
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

            {/* Details */}
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
    </div>
  );
}
