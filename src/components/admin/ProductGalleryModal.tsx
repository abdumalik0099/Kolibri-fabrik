import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { DocumentSnapshot } from "firebase/firestore";

import BlurUpImage from "@/components/BlurUpImage";
import { getProduct, Product, updateProduct } from "@/lib/products";
import { blobToDataUrl, imageFileToWebp } from "@/lib/imageUtils";
import {
  addProductGalleryTelegramImage,
  deleteProductGalleryImage,
  getProductGalleryCount,
  getProductGalleryPage,
  ProductGalleryItem,
} from "@/lib/productGallery";
import { deleteTelegramMessage, telegramFileProxyUrl, uploadImageToTelegram } from "@/lib/telegramUpload";

type UploadRow = {
  id: string;
  name: string;
  status: "queued" | "converting" | "saving" | "done" | "error";
  progress: number; // 0..100
  error?: string;
};

function pageCount(total: number, perPage: number) {
  return Math.max(1, Math.ceil(total / perPage));
}

export default function ProductGalleryModal(props: {
  open: boolean;
  productId: string | null;
  productTitle?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { open, productId, productTitle, onClose, onChanged } = props;

  const perPage = 40;
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<ProductGalleryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);

  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalPages = useMemo(() => pageCount(count, perPage), [count, perPage]);
  const currentPage = Math.min(page, totalPages);

  function updateUpload(id: string, patch: Partial<UploadRow>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function fetchPage(pageNum: number) {
    if (!productId) return;
    const safePage = Math.max(1, pageNum);
    const cursor = pageCursors[safePage - 1] ?? null;

    setLoadingPage(true);
    try {
      const res = await getProductGalleryPage({ productId, pageSize: perPage, cursor });
      setItems(res.items);
      setPage(safePage);
      setPageCursors((prev) => {
        const next = [...prev];
        next[safePage] = res.nextCursor;
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error("Sahifani yuklashda xatolik");
    } finally {
      setLoadingPage(false);
    }
  }

  async function reloadAll() {
    if (!productId) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getProduct(productId), getProductGalleryCount(productId)]);
      setProduct(p);
      setCount(c);
      setPageCursors([null]);
      await fetchPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Galereyani yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !productId) return;
    setUploads([]);
    setBusy(false);
    setItems([]);
    setCount(0);
    setPage(1);
    setPageCursors([null]);
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  async function handleDelete(item: ProductGalleryItem) {
    if (!productId) return;
    const ok = confirm("Rasmni o'chirishni tasdiqlaysizmi?");
    if (!ok) return;

    try {
      if (typeof item.telegramMessageId === "number") {
        try {
          await deleteTelegramMessage(item.telegramMessageId);
        } catch {
          // If bot isn't admin, Telegram deletion can fail; still delete Firestore doc.
        }
      }
      await deleteProductGalleryImage(productId, item.id);
      toast.success("Rasm o'chirildi");
      onChanged?.();
      await reloadAll();
    } catch (err) {
      console.error(err);
      toast.error("O'chirishda xatolik");
    }
  }

  async function startUpload(files: File[]) {
    if (!productId) return;
    if (files.length === 0) return;

    const rows: UploadRow[] = files.map((f, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 8)}`,
      name: f.name,
      status: "queued",
      progress: 0,
    }));
    setUploads(rows);
    setBusy(true);

    const concurrency = 2;
    let nextIndex = 0;
    let coverSet = Boolean(product?.galleryCoverUrl);

    async function worker() {
      while (nextIndex < files.length) {
        const i = nextIndex;
        nextIndex += 1;
        const rowId = rows[i]!.id;
        const file = files[i]!;

        try {
          updateUpload(rowId, { status: "converting", progress: 5 });
          const webp = await imageFileToWebp(file);
          updateUpload(rowId, { status: "converting", progress: 35 });

          const dataUrl = await blobToDataUrl(webp);
          updateUpload(rowId, { status: "saving", progress: 60 });

          const tg = await uploadImageToTelegram({ dataUrl, fileName: webp.name || "image.webp" });
          const bestFileId = tg.largest_file_id || tg.file_id;
          const smallestFileId = tg.smallest_file_id || tg.file_id;
          const srcUrl = telegramFileProxyUrl(bestFileId);
          const thumbUrl = telegramFileProxyUrl(smallestFileId);
          updateUpload(rowId, { status: "saving", progress: 85 });

          await addProductGalleryTelegramImage({
            productId,
            telegramFileId: tg.file_id,
            telegramSmallestFileId: tg.smallest_file_id,
            telegramLargestFileId: tg.largest_file_id,
            telegramMessageId: tg.message_id,
            srcUrl,
            thumbUrl,
            originalName: file.name,
          });
          // Store at least one gallery link on the product doc (for quick cover/preview).
          if (!coverSet) {
            await updateProduct(productId, { galleryCoverUrl: srcUrl, galleryCoverThumbUrl: thumbUrl });
            setProduct((prev) => (prev ? { ...prev, galleryCoverUrl: srcUrl, galleryCoverThumbUrl: thumbUrl } : prev));
            coverSet = true;
          }

          updateUpload(rowId, { status: "done", progress: 100 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Noma'lum xato";
          updateUpload(rowId, { status: "error", error: message });
          toast.error(`${file.name}: ${message}`);
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      toast.success("Galereya rasmlari Telegram'ga yuklandi");
      onChanged?.();
      await reloadAll();
    } catch (err) {
      console.error(err);
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!open || !productId) return null;

  const headerTitle = productTitle || product?.title || "Galereya";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="bg-charcoal-light border border-gold/20 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
            <div>
              <div className="text-xs tracking-widest uppercase text-gold">Product Gallery</div>
              <h2 className="font-heading text-xl">{headerTitle}</h2>
              <div className="text-xs text-cream/60 mt-1">Jami: {count} ta rasm</div>
            </div>
            <button type="button" onClick={onClose} className="text-cream/50 hover:text-cream transition" disabled={busy}>
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 bg-charcoal border border-dashed border-gold/30 text-cream/70 rounded-lg px-4 py-3 text-sm cursor-pointer hover:border-gold transition-colors">
                  <Upload size={16} />
                  Bulk Upload (Telegram)
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []);
                      void startUpload(list);
                    }}
                  />
                </label>
                {busy ? (
                  <div className="text-xs text-cream/60 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} /> Saqlanmoqda...
                  </div>
                ) : (
                  <div className="text-xs text-cream/60">Tavsiya: bir martada 10-30 ta</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gold/20 text-xs text-cream/70 hover:text-cream hover:border-gold/50 transition disabled:opacity-50"
                  disabled={currentPage <= 1}
                  onClick={() => void fetchPage(currentPage - 1)}
                >
                  Prev
                </button>
                <div className="text-xs text-cream/60">
                  Page {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gold/20 text-xs text-cream/70 hover:text-cream hover:border-gold/50 transition disabled:opacity-50"
                  disabled={currentPage >= totalPages}
                  onClick={() => void fetchPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>

            {uploads.length > 0 ? (
              <div className="mt-5 rounded-xl border border-gold/10 bg-charcoal/50 overflow-hidden">
                <div className="px-4 py-3 text-xs tracking-widest uppercase text-cream/60 border-b border-gold/10">
                  Upload Queue
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {uploads.map((u) => (
                    <div key={u.id} className="px-4 py-3 border-b border-gold/10 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-cream truncate">{u.name}</div>
                        <div className="text-xs text-cream/60 shrink-0">
                          {u.status === "error"
                            ? "Error"
                            : u.status === "done"
                              ? "Done"
                              : u.status === "saving"
                                ? "Saving..."
                                : u.status === "converting"
                                  ? "Converting..."
                                  : "Queued"}
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-charcoal overflow-hidden border border-gold/10">
                        <div
                          className={`h-full ${u.status === "error" ? "bg-destructive" : "bg-gold"}`}
                          style={{ width: `${u.status === "error" ? 100 : u.progress}%` }}
                        />
                      </div>
                      {u.error ? <div className="mt-2 text-xs text-destructive/90">{u.error}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              {loading || loadingPage ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="animate-spin text-gold" size={28} />
                </div>
              ) : count === 0 ? (
                <div className="text-center py-14 text-cream/50">
                  Galereya bo'sh. Bulk Upload bilan rasmlar qo'shing.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((it, idx) => {
                    const src = it.srcUrl || "";
                    return (
                      <div key={it.id} className="rounded-xl border border-gold/10 bg-charcoal/50 overflow-hidden">
                        <BlurUpImage
                          src={src}
                          thumbSrc={it.thumbUrl || undefined}
                          alt="Gallery image"
                          className="aspect-square"
                          imgClassName="object-cover"
                          loading="lazy"
                        />
                        <div className="p-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="flex-1 inline-flex items-center justify-center gap-2 text-xs px-2 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
                            onClick={() => void handleDelete(it)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
