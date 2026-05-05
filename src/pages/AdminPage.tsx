import React from "react";
import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Upload, X, LogIn, Package, FolderOpen, ChartBar, Images, Fingerprint } from "lucide-react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductImageUrl,
  getProductVideoUrl,
  Product,
} from "../lib/products";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  Category,
} from "../lib/categories";
import { toast } from "sonner";
import StatisticsPanel from "../components/admin/StatisticsPanel";
import SearchField from "../components/SearchField";
import ProductGalleryModal from "../components/admin/ProductGalleryModal";
import logoPlaceholder from "../assets/logo.png";

const ADMIN_PASS = "parol";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const WEBAUTHN_CRED_KEY = "admin_webauthn_credId";

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Admin Panel", id: window.location.hostname },
      user: { id: userId, name: "admin", displayName: "Admin" },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  }) as PublicKeyCredential;
  const credId = bufToB64(credential.rawId);
  localStorage.setItem(WEBAUTHN_CRED_KEY, credId);
  return credId;
}

async function verifyBiometric(credId: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{ id: b64ToBuf(credId), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  }) as PublicKeyCredential;
  return !!assertion;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"products" | "categories" | "statistics">("products");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const [bioSupported, setBioSupported] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [catName, setCatName] = useState("");
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catSubmitting, setCatSubmitting] = useState(false);

  useEffect(() => {
    const supported = isWebAuthnSupported();
    setBioSupported(supported);
    if (supported) {
      setBioRegistered(!!localStorage.getItem(WEBAUTHN_CRED_KEY));
    }
  }, []);

  useEffect(() => {
    if (authed) { loadProducts(); loadCategories(); }
  }, [authed]);

  useEffect(() => {
    if (selectedCategoryId && !categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  // Parol bilan kirish
  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      if (bioSupported && !bioRegistered) {
        setShowRegisterPrompt(true); // Biometrik saqlashni taklif qil
      } else {
        setAuthed(true);
      }
    } else {
      toast.error("Noto'g'ri parol");
    }
  }

  // Biometrik ro'yxatdan o'tkazish
  async function handleRegisterBiometric() {
    setBioLoading(true);
    try {
      await registerBiometric();
      setBioRegistered(true);
      toast.success("Barmoq izi / Face ID saqlandi!");
      setShowRegisterPrompt(false);
      setAuthed(true);
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        toast.error("Xatolik: " + (err?.message || "Noma'lum"));
      }
      setShowRegisterPrompt(false);
      setAuthed(true);
    } finally {
      setBioLoading(false);
    }
  }

  // Biometrik kirish
  async function handleBiometricLogin() {
    const credId = localStorage.getItem(WEBAUTHN_CRED_KEY);
    if (!credId) return;
    setBioLoading(true);
    try {
      const ok = await verifyBiometric(credId);
      if (ok) { toast.success("Kirish muvaffaqiyatli!"); setAuthed(true); }
    } catch (err: any) {
      if (err?.name === "InvalidStateError") {
        localStorage.removeItem(WEBAUTHN_CRED_KEY);
        setBioRegistered(false);
        toast.error("Biometrik eskirgan, parol bilan kiring");
      } else if (err?.name !== "NotAllowedError") {
        toast.error("Xatolik: " + (err?.message || "Noma'lum"));
      }
    } finally {
      setBioLoading(false); }
  }

  function removeBiometric() {
    localStorage.removeItem(WEBAUTHN_CRED_KEY);
    setBioRegistered(false);
    toast.success("Biometrik o'chirildi");
  }

  async function loadProducts() {
    setLoadingProducts(true);
    try { setProducts(await getProducts()); }
    catch { toast.error("Mahsulotlarni yuklashda xatolik"); }
    finally { setLoadingProducts(false); }
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try { setCategories(await getCategories()); }
    catch { toast.error("Kategoriyalarni yuklashda xatolik"); }
    finally { setLoadingCategories(false); }
  }

  function openAddProduct() {
    setEditingProduct(null); setTitle(""); setPrice("0");
    setCategory(categories[0]?.name || ""); setDescription("");
    setImageFile(null); setVideoFile(null); setShowProductForm(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p); setTitle(p.title); setPrice(p.price.toString());
    setCategory(p.category); setDescription(p.description);
    setImageFile(null); setVideoFile(null); setShowProductForm(true);
  }

  function openGallery(p: Product) { setGalleryProduct(p); setGalleryOpen(true); }

  async function handleProductSubmit(e: FormEvent) {
    e.preventDefault();
    if (videoFile && videoFile.size > MAX_VIDEO_BYTES) { toast.error("Video hajmi 100MB dan oshmasligi kerak"); return; }
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, { title, price: Number(price), category, description }, imageFile || undefined, videoFile || undefined);
        toast.success("Mahsulot yangilandi");
      } else {
        if (!imageFile && !videoFile) { toast.error("Rasm yoki video tanlang"); setSubmitting(false); return; }
        await addProduct({ title, price: Number(price), category, description }, imageFile || undefined, videoFile || undefined);
        toast.success("Mahsulot qo'shildi");
      }
      setShowProductForm(false); loadProducts();
    } catch (err) {
      toast.error("Xatolik: " + (err instanceof Error ? err.message : "Noma'lum xato"));
    } finally { setSubmitting(false); }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    try { await deleteProduct(id); toast.success("O'chirildi"); loadProducts(); } catch { toast.error("Xatolik"); }
  }

  function openAddCategory() { setEditingCategory(null); setCatName(""); setCatImageFile(null); setShowCategoryForm(true); }
  function openEditCategory(c: Category) { setEditingCategory(c); setCatName(c.name); setCatImageFile(null); setShowCategoryForm(true); }

  async function handleCategorySubmit(e: FormEvent) {
    e.preventDefault(); setCatSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, catName, catImageFile || undefined);
        toast.success("Kategoriya yangilandi");
      } else {
        if (!catImageFile) { toast.error("Rasm tanlang"); setCatSubmitting(false); return; }
        await addCategory(catName, catImageFile);
        toast.success("Kategoriya qo'shildi");
      }
      setShowCategoryForm(false); loadCategories();
    } catch (err) {
      toast.error("Xatolik: " + (err instanceof Error ? err.message : "Noma'lum xato"));
    } finally { setCatSubmitting(false); }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    try { await deleteCategory(id); toast.success("O'chirildi"); loadCategories(); } catch { toast.error("Xatolik"); }
  }

  // ── LOGIN EKRANI ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-charcoal-light border border-gold/20 rounded-2xl p-8 w-full max-w-sm"
        >
          <h1 className="font-heading text-2xl text-cream text-center mb-6">
            <span className="text-gold-gradient">Admin</span> Panel
          </h1>

          {/* Biometrik saqlash taklifi (paroldan keyin birinchi marta) */}
          <AnimatePresence>
            {showRegisterPrompt && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-4 rounded-xl border border-gold/30 bg-gold/5 text-center"
              >
                <Fingerprint size={32} className="mx-auto text-gold mb-2" />
                <p className="text-cream text-sm font-medium mb-1">Barmoq izi / Face ID saqlash</p>
                <p className="text-cream/50 text-xs mb-4">Keyingi kirishda parolsiz kiring</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterBiometric}
                    disabled={bioLoading}
                    className="flex-1 bg-gold-gradient text-charcoal py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    {bioLoading ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                    Saqlash
                  </button>
                  <button
                    onClick={() => { setShowRegisterPrompt(false); setAuthed(true); }}
                    className="flex-1 border border-gold/20 text-cream/60 py-2 rounded-lg text-xs uppercase tracking-wider hover:text-cream transition"
                  >
                    O'tkazib yuborish
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Biometrik kirish tugmasi */}
          {bioRegistered && !showRegisterPrompt && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={handleBiometricLogin}
              disabled={bioLoading}
              className="w-full mb-5 py-5 rounded-xl border border-gold/40 bg-gold/5 hover:bg-gold/10 text-cream flex flex-col items-center justify-center gap-2 transition-all group"
            >
              {bioLoading
                ? <Loader2 size={32} className="animate-spin text-gold" />
                : <Fingerprint size={32} className="text-gold group-hover:scale-110 transition-transform" />
              }
              <span className="text-sm font-medium">
                {bioLoading ? "Tekshirilmoqda..." : "Barmoq izi / Face ID bilan kirish"}
              </span>
            </motion.button>
          )}

          {/* Ajratgich */}
          {bioRegistered && !showRegisterPrompt && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gold/20" />
              <span className="text-cream/30 text-xs uppercase tracking-widest">yoki parol</span>
              <div className="flex-1 h-px bg-gold/20" />
            </div>
          )}

          {/* Parol bilan kirish */}
          {!showRegisterPrompt && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Parolni kiriting"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-charcoal border border-gold/20 text-cream rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
              />
              <button type="submit" className="w-full bg-gold-gradient text-charcoal py-3 rounded-lg font-medium text-sm tracking-wider uppercase flex items-center justify-center gap-2">
                <LogIn size={16} /> Kirish
              </button>
            </form>
          )}

          {!bioSupported && (
            <p className="text-center text-cream/25 text-xs mt-4">
              Brauzeringiz biometrikni qo'llab-quvvatlamaydi
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // ── ADMIN PANEL ───────────────────────────────────────────
  const inputClass = "w-full bg-charcoal border border-gold/20 text-cream rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors";
  const labelClass = "text-xs uppercase tracking-wider text-cream/60 mb-1 block";
  const normalizedSearch = productSearch.trim().toLowerCase();
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const productsForCategory = selectedCategory ? products.filter((p) => p.category === selectedCategory.name) : products;
  const filteredProducts = productsForCategory.filter((p) =>
    !normalizedSearch ||
    p.title.toLowerCase().includes(normalizedSearch) ||
    p.description.toLowerCase().includes(normalizedSearch) ||
    p.category.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div className="min-h-screen bg-charcoal text-cream overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gold/10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-heading text-xl">
          <span className="text-gold-gradient">Parda Saloni</span> — Admin
        </h1>
        <div className="flex items-center gap-3">
          {bioRegistered && (
            <button onClick={removeBiometric} title="Biometrikni o'chirish" className="border border-gold/20 text-cream/40 hover:text-cream/70 px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition">
              <Fingerprint size={14} /> O'chirish
            </button>
          )}
          {tab !== "statistics" && (
            <button onClick={tab === "products" ? openAddProduct : openAddCategory} className="bg-gold-gradient text-charcoal px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Plus size={16} />
              {tab === "products" ? "Mahsulot qo'shish" : "Kategoriya qo'shish"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gold/10 px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {(["products", "categories", "statistics"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 px-5 py-3 text-sm font-medium tracking-wider inline-flex items-center gap-2 border-b-2 transition-colors ${tab === t ? "border-gold text-gold" : "border-transparent text-cream/50 hover:text-cream/80"}`}>
              {t === "products" && <><Package size={16} /> Mahsulotlar</>}
              {t === "categories" && <><FolderOpen size={16} /> Kategoriyalar</>}
              {t === "statistics" && <><ChartBar size={16} /> Statistika</>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* PRODUCT FORM MODAL */}
        <AnimatePresence>
          {showProductForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6">
              <motion.form onSubmit={handleProductSubmit} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-charcoal-light border border-gold/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl">{editingProduct ? "Tahrirlash" : "Yangi mahsulot"}</h2>
                  <button type="button" onClick={() => setShowProductForm(false)} className="text-cream/50 hover:text-cream"><X size={20} /></button>
                </div>
                <div className="flex flex-col gap-4">
                  <div><label className={labelClass}>Nomi</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Parda nomi" /></div>
                  <div>
                    <label className={labelClass}>Kategoriya</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                      {categories.length === 0 && <option value="">— Avval kategoriya qo'shing —</option>}
                      {categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                    </select>
                  </div>
                  <div><label className={labelClass}>Tavsif</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Mahsulot haqida..." /></div>
                  <div>
                    <label className={labelClass}>Rasm {editingProduct && "(ixtiyoriy)"}</label>
                    <label className="flex items-center justify-center gap-2 w-full bg-charcoal border border-dashed border-gold/30 text-cream/60 rounded-lg px-4 py-6 text-sm cursor-pointer hover:border-gold transition-colors">
                      <Upload size={18} />{imageFile ? imageFile.name : "Rasm tanlang"}
                      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>Video {editingProduct && "(ixtiyoriy)"}</label>
                    <label className="flex items-center justify-center gap-2 w-full bg-charcoal border border-dashed border-gold/30 text-cream/60 rounded-lg px-4 py-6 text-sm cursor-pointer hover:border-gold transition-colors">
                      <Upload size={18} />{videoFile ? videoFile.name : "Video tanlang"}
                      <input type="file" accept="video/*" onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > MAX_VIDEO_BYTES) { toast.error("Video hajmi 100MB dan oshmasligi kerak"); e.currentTarget.value = ""; setVideoFile(null); return; }
                        setVideoFile(file);
                      }} className="hidden" />
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full mt-6 bg-gold-gradient text-charcoal py-3 rounded-lg font-medium text-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingProduct ? "Saqlash" : "Qo'shish"}
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CATEGORY FORM MODAL */}
        <AnimatePresence>
          {showCategoryForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6">
              <motion.form onSubmit={handleCategorySubmit} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-charcoal-light border border-gold/20 rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl">{editingCategory ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</h2>
                  <button type="button" onClick={() => setShowCategoryForm(false)} className="text-cream/50 hover:text-cream"><X size={20} /></button>
                </div>
                <div className="flex flex-col gap-4">
                  <div><label className={labelClass}>Kategoriya nomi</label><input value={catName} onChange={(e) => setCatName(e.target.value)} className={inputClass} placeholder="Masalan: Klassik" /></div>
                  <div>
                    <label className={labelClass}>Rasm {editingCategory && "(ixtiyoriy)"}</label>
                    <label className="flex items-center justify-center gap-2 w-full bg-charcoal border border-dashed border-gold/30 text-cream/60 rounded-lg px-4 py-6 text-sm cursor-pointer hover:border-gold transition-colors">
                      <Upload size={18} />{catImageFile ? catImageFile.name : "Rasm tanlang"}
                      <input type="file" accept="image/*" onChange={(e) => setCatImageFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    {editingCategory && (
                      <div className="mt-2 rounded-lg overflow-hidden w-20 h-20">
                        <img src={editingCategory.imageUrl} alt={editingCategory.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={catSubmitting} className="w-full mt-6 bg-gold-gradient text-charcoal py-3 rounded-lg font-medium text-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                  {catSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingCategory ? "Saqlash" : "Qo'shish"}
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRODUCTS TAB */}
        {tab === "products" && (
          <>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <SearchField value={productSearch} onChange={setProductSearch} label="Mahsulot qidiruv" description="Nomi, tavsifi yoki kategoriyasi bo'yicha." placeholder="Masalan: klassik yoki yorqin" />
                <p className="text-xs text-cream/60">Natija: {filteredProducts.length} ta mahsulot</p>
              </div>
              {categories.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <button onClick={() => setSelectedCategoryId(null)} className={`min-w-[140px] flex-shrink-0 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${selectedCategoryId === null ? "border-gold bg-gold/10 text-gold" : "border-gold/20 text-cream/60 hover:text-cream/80"}`}>
                    Hammasi
                  </button>
                  {categories.map((c) => (
                    <button key={c.id} onClick={() => setSelectedCategoryId(c.id)} className={`min-w-[140px] flex-shrink-0 rounded-2xl border border-gold/20 bg-charcoal-light/40 text-left transition ${selectedCategoryId === c.id ? "border-gold text-gold" : "text-cream/60 hover:text-cream/80"}`}>
                      <div className="relative h-20 w-full overflow-hidden rounded-t-2xl">
                        <img src={c.imageUrl} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                      <div className="px-3 py-2 text-xs uppercase tracking-wider">{c.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {loadingProducts ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={32} /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-cream/50">
                <p className="text-lg">{selectedCategory ? "Bu kategoriyada mahsulotlar yo'q" : "Hozircha mahsulotlar yo'q"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((p) => {
                  const imageSrc = getProductImageUrl(p);
                  const videoSrc = getProductVideoUrl(p);
                  return (
                    <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-charcoal-light border border-gold/10 rounded-xl overflow-hidden group">
                      <div className="relative aspect-square overflow-hidden">
                        {videoSrc ? (
                          <video src={videoSrc} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted loop autoPlay playsInline preload="metadata" />
                        ) : imageSrc ? (
                          <img src={imageSrc} alt={p.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = logoPlaceholder; }} />
                        ) : (
                          <img src={logoPlaceholder} alt="Placeholder" loading="lazy" className="w-full h-full object-contain p-8 opacity-60 bg-charcoal/70" />
                        )}
                      </div>
                      <div className="p-4">
                        <span className="text-xs tracking-wider uppercase text-gold">{p.category}</span>
                        <h3 className="font-heading text-lg font-semibold mt-1">{p.title}</h3>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => openEditProduct(p)} className="flex-1 border border-gold/20 text-gold text-xs py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-gold/10 transition-colors"><Pencil size={14} /> Tahrirlash</button>
                          <button onClick={() => openGallery(p)} className="border border-gold/20 text-gold text-xs py-2 px-3 rounded-lg flex items-center justify-center hover:bg-gold/10 transition-colors" title="Galereya"><Images size={14} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="border border-destructive/30 text-destructive text-xs py-2 px-3 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CATEGORIES TAB */}
        {tab === "categories" && (
          loadingCategories ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={32} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((c) => (
                <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-charcoal-light border border-gold/10 rounded-xl overflow-hidden group">
                  <div className="aspect-video overflow-hidden">
                    <img src={c.imageUrl} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-lg font-semibold">{c.name}</h3>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openEditCategory(c)} className="flex-1 border border-gold/20 text-gold text-xs py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-gold/10 transition-colors"><Pencil size={14} /> Tahrirlash</button>
                      <button onClick={() => handleDeleteCategory(c.id)} className="border border-destructive/30 text-destructive text-xs py-2 px-3 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* STATISTICS TAB */}
        {tab === "statistics" && <div className="mt-8"><StatisticsPanel /></div>}
      </div>

      <ProductGalleryModal
        open={galleryOpen}
        productId={galleryProduct?.id || null}
        productTitle={galleryProduct?.title}
        onClose={() => setGalleryOpen(false)}
        onChanged={() => loadProducts()}
      />
    </div>
  );
}