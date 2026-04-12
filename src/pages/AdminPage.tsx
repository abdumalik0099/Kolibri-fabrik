import { useEffect, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Upload, X, LogIn, Package, FolderOpen, ChartBar } from "lucide-react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  Product,
} from "@/lib/products";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  Category,
} from "@/lib/categories";
import { toast } from "sonner";
import StatisticsPanel from "@/components/admin/StatisticsPanel";
import SearchField from "@/components/SearchField";

const ADMIN_PASS = "parol";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"products" | "categories" | "statistics">("products");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Product form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Category form
  const [catName, setCatName] = useState("");
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catSubmitting, setCatSubmitting] = useState(false);

  useEffect(() => {
    if (authed) {
      loadProducts();
      loadCategories();
    }
  }, [authed]);

  useEffect(() => {
    if (selectedCategoryId && !categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      setProducts(await getProducts());
    } catch {
      toast.error("Mahsulotlarni yuklashda xatolik");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      setCategories(await getCategories());
    } catch {
      toast.error("Kategoriyalarni yuklashda xatolik");
    } finally {
      setLoadingCategories(false);
    }
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      setAuthed(true);
    } else {
      toast.error("Noto'g'ri parol");
    }
  }

  // ---- Product handlers ----
  function openAddProduct() {
    setEditingProduct(null);
    setTitle("");
    setPrice("0");
    setCategory(categories[0]?.name || "");
    setDescription("");
    setImageFile(null);
    setShowProductForm(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setTitle(p.title);
    setPrice(p.price.toString());
    setCategory(p.category);
    setDescription(p.description);
    setImageFile(null);
    setShowProductForm(true);
  }

  async function handleProductSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, { title, price: Number(price), category, description }, imageFile || undefined);
        toast.success("Mahsulot yangilandi");
      } else {
        if (!imageFile) { toast.error("Rasm tanlang"); setSubmitting(false); return; }
        await addProduct({ title, price: Number(price), category, description }, imageFile);
        toast.success("Mahsulot qo'shildi");
      }
      setShowProductForm(false);
      loadProducts();
    } catch (err) {
      console.error("Product submit error:", err);
      toast.error("Xatolik yuz berdi: " + (err instanceof Error ? err.message : "Noma'lum xato"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    try { await deleteProduct(id); toast.success("O'chirildi"); loadProducts(); } catch { toast.error("Xatolik"); }
  }

  // ---- Category handlers ----
  function openAddCategory() {
    setEditingCategory(null);
    setCatName("");
    setCatImageFile(null);
    setShowCategoryForm(true);
  }

  function openEditCategory(c: Category) {
    setEditingCategory(c);
    setCatName(c.name);
    setCatImageFile(null);
    setShowCategoryForm(true);
  }

  async function handleCategorySubmit(e: FormEvent) {
    e.preventDefault();
    setCatSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, catName, catImageFile || undefined);
        toast.success("Kategoriya yangilandi");
      } else {
        if (!catImageFile) { toast.error("Rasm tanlang"); setCatSubmitting(false); return; }
        await addCategory(catName, catImageFile);
        toast.success("Kategoriya qo'shildi");
      }
      setShowCategoryForm(false);
      loadCategories();
    } catch (err) {
      console.error("Category submit error:", err);
      toast.error("Xatolik yuz berdi: " + (err instanceof Error ? err.message : "Noma'lum xato"));
    } finally {
      setCatSubmitting(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    try { await deleteCategory(id); toast.success("O'chirildi"); loadCategories(); } catch { toast.error("Xatolik"); }
  }

  // ---- Login screen ----
  if (!authed) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-charcoal-light border border-gold/20 rounded-2xl p-8 w-full max-w-sm"
        >
          <h1 className="font-heading text-2xl text-cream text-center mb-6">
            <span className="text-gold-gradient">Admin</span> Panel
          </h1>
          <input
            type="password"
            placeholder="Parolni kiriting"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full bg-charcoal border border-gold/20 text-cream rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
          />
          <button type="submit" className="w-full mt-4 bg-gold-gradient text-charcoal py-3 rounded-lg font-medium text-sm tracking-wider uppercase flex items-center justify-center gap-2">
            <LogIn size={16} /> Kirish
          </button>
        </motion.form>
      </div>
    );
  }

  const inputClass = "w-full bg-charcoal border border-gold/20 text-cream rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors";
  const labelClass = "text-xs uppercase tracking-wider text-cream/60 mb-1 block";
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const productsForCategory = selectedCategory ? products.filter((p) => p.category === selectedCategory.name) : products;
  const filteredProducts = productsForCategory.filter((product) => {
    if (!normalizedProductSearch) return true;
    return (
      product.title.toLowerCase().includes(normalizedProductSearch) ||
      product.description.toLowerCase().includes(normalizedProductSearch) ||
      product.category.toLowerCase().includes(normalizedProductSearch)
    );
  });

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      {/* Header */}
      <div className="border-b border-gold/10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-heading text-xl">
          <span className="text-gold-gradient">Parda Saloni</span> — Admin
        </h1>
        {tab !== "statistics" && (
          <button
            onClick={tab === "products" ? openAddProduct : openAddCategory}
            className="bg-gold-gradient text-charcoal px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            {tab === "products" ? "Mahsulot qo'shish" : "Kategoriya qo'shish"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gold/10 px-6 flex gap-1">
        <button
          onClick={() => setTab("products")}
          className={`px-5 py-3 text-sm font-medium tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            tab === "products" ? "border-gold text-gold" : "border-transparent text-cream/50 hover:text-cream/80"
          }`}
        >
          <Package size={16} /> Mahsulotlar
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`px-5 py-3 text-sm font-medium tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            tab === "categories" ? "border-gold text-gold" : "border-transparent text-cream/50 hover:text-cream/80"
          }`}
        >
          <FolderOpen size={16} /> Kategoriyalar
        </button>
        <button
          onClick={() => setTab("statistics")}
          className={`px-5 py-3 text-sm font-medium tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            tab === "statistics" ? "border-gold text-gold" : "border-transparent text-cream/50 hover:text-cream/80"
          }`}
        >
          <ChartBar size={16} /> Statistika
        </button>
      </div>

      <div className="p-6">
        {/* ========== PRODUCT FORM MODAL ========== */}
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
                </div>
                <button type="submit" disabled={submitting} className="w-full mt-6 bg-gold-gradient text-charcoal py-3 rounded-lg font-medium text-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingProduct ? "Saqlash" : "Qo'shish"}
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== CATEGORY FORM MODAL ========== */}
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

        {/* ========== TAB CONTENT ========== */}
        {tab === "products" ? (
          <>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <SearchField
                  value={productSearch}
                  onChange={setProductSearch}
                  label="Mahsulot qidiruv"
                  description="Nomi, tavsifi yoki kategoriyasi bo'yicha izlagan narsangizni toping."
                  placeholder="Masalan: premium klassik yoki yorqin to'qima"
                />
                <p className="text-xs text-cream/60">
                  Natija: {filteredProducts.length} ta mahsulot
                </p>
              </div>
              {categories.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={`min-w-[140px] flex-shrink-0 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                      selectedCategoryId === null
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-gold/20 text-cream/60 hover:text-cream/80"
                    }`}
                  >
                    Hammasi
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`min-w-[140px] flex-shrink-0 rounded-2xl border border-gold/20 bg-charcoal-light/40 text-left transition ${
                        selectedCategoryId === c.id ? "border-gold text-gold" : "text-cream/60 hover:text-cream/80"
                      }`}
                    >
                      <div className="relative h-20 w-full overflow-hidden rounded-t-2xl">
                        <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
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
                <p className="text-sm mt-2">{selectedCategory ? "Yuqoridan boshqa kategoriya tanlang yoki yangi mahsulot qo'shing" : "Yuqoridagi tugmani bosib mahsulot qo'shing"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((p) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-charcoal-light border border-gold/10 rounded-xl overflow-hidden group">
                    <div className="aspect-square overflow-hidden">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <span className="text-xs tracking-wider uppercase text-gold">{p.category}</span>
                      <h3 className="font-heading text-lg font-semibold mt-1">{p.title}</h3>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => openEditProduct(p)} className="flex-1 border border-gold/20 text-gold text-xs py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-gold/10 transition-colors"><Pencil size={14} /> Tahrirlash</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="border border-destructive/30 text-destructive text-xs py-2 px-3 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : loadingCategories ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : loadingCategories ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-cream/50">
            <p className="text-lg">Hozircha kategoriyalar yo'q</p>
            <p className="text-sm mt-2">Yuqoridagi tugmani bosib kategoriya qo'shing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-charcoal-light border border-gold/10 rounded-xl overflow-hidden group">
                <div className="aspect-video overflow-hidden">
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
        )}
        {tab === "statistics" && (
          <div className="mt-8">
            <StatisticsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
