import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProducts, Product } from "@/lib/products";
import { getCategories, Category } from "@/lib/categories";
import { useSearchFocus } from "@/context/SearchFocusContext";
import SearchField from "@/components/SearchField";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "Barchasi";
  const searchTerm = searchParams.get("q") || "";
  const applyParamChanges = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    setSearchParams(params);
  };
  const handleCategorySelect = (categoryName?: string) => {
    applyParamChanges((params) => {
      if (!categoryName || categoryName === "Barchasi") {
        params.delete("category");
      } else {
        params.set("category", categoryName);
      }
    });
  };
  const { isSearchFocused, setSearchFocused } = useSearchFocus();

  const heroTransform = isSearchFocused
    ? { y: -140, opacity: 0.6 }
    : { y: 0, opacity: 1 };
  const categoryTransform = isSearchFocused
    ? { y: -140, opacity: 0.5 }
    : { y: 0, opacity: 1 };
  const heroStyle = isSearchFocused ? { display: "none" } : undefined;
  const categoryStyle = isSearchFocused ? { display: "none" } : undefined;

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredByCategory =
    activeCategory === "Barchasi"
      ? products
      : products.filter((p) => p.category === activeCategory);
  const filteredProducts = filteredByCategory.filter((product) => {
    if (!normalizedSearch) return true;
    return (
      product.title.toLowerCase().includes(normalizedSearch) ||
      product.category.toLowerCase().includes(normalizedSearch) ||
      product.description.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-12">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroTransform}
            transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
            className="text-center mb-12"
            style={heroStyle}
          >
            <span className="text-sm tracking-[0.2em] uppercase text-gold font-medium">Mahsulotlar</span>
            <h1 className="font-heading text-4xl md:text-6xl mt-3 font-light">
              Bizning <span className="text-gold-gradient font-semibold italic">katalog</span>
            </h1>
          </motion.div>

          <div className="max-w-2xl mx-auto mb-10">
            <SearchField
              value={searchTerm}
              onChange={(value) =>
                applyParamChanges((params) => {
                  const next = value.trim();
                  if (!next) params.delete("q");
                  else params.set("q", next);
                })
              }
              label="Qidiruv"
              description="Mahsulot nomi, tavsifi yoki kategoriyasi bo'yicha qidiring."
              placeholder="Masalan: premium, klassik, oq rang..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {/* Category filters with images */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-12"
            animate={categoryTransform}
            transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
            style={categoryStyle}
          >
            <button
              onClick={() => handleCategorySelect("Barchasi")}
              className={`px-5 py-2 rounded-full text-sm font-medium tracking-wider uppercase transition-all duration-300 ${
                activeCategory === "Barchasi"
                  ? "bg-gold-gradient text-charcoal"
                  : "border border-border text-muted-foreground hover:border-gold hover:text-foreground"
              }`}
            >
              Barchasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium tracking-wider uppercase transition-all duration-300 ${
                  activeCategory === cat.name
                    ? "bg-gold-gradient text-charcoal"
                    : "border border-border text-muted-foreground hover:border-gold hover:text-foreground"
                }`}
              >
                <img src={cat.imageUrl} alt={cat.name} className="w-5 h-5 rounded-full object-cover" />
                {cat.name}
              </button>
            ))}
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-gold" size={32} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Hozircha mahsulotlar yo'q.</p>
              <p className="text-sm text-muted-foreground/60 mt-2">Admin panelidan mahsulot qo'shing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <Link to={`/mahsulot/${product.id}`} className="group block">
                    <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-muted">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="mt-3">
                      <span className="text-xs tracking-wider uppercase text-gold">{product.category}</span>
                      <h3 className="font-heading text-base md:text-lg font-semibold mt-1 leading-tight">{product.title}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
