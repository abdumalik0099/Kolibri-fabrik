import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProducts, Product } from "@/lib/products";
import { getCategories, Category } from "@/lib/categories";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "Barchasi";

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === "Barchasi"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-12">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <span className="text-sm tracking-[0.2em] uppercase text-gold font-medium">Mahsulotlar</span>
            <h1 className="font-heading text-4xl md:text-6xl mt-3 font-light">
              Bizning <span className="text-gold-gradient font-semibold italic">katalog</span>
            </h1>
          </motion.div>

          {/* Category filters with images */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setSearchParams({})}
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
                onClick={() => setSearchParams({ category: cat.name })}
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
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-gold" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Hozircha mahsulotlar yo'q.</p>
              <p className="text-sm text-muted-foreground/60 mt-2">Admin panelidan mahsulot qo'shing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((product, i) => (
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
