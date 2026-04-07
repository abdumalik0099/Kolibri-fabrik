import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-curtain.jpg";
import turkeyFlag from "@/assets/turkey-flag.png";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCategories, Category } from "@/lib/categories";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src={heroImg} alt="Hashamatli pardalar" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/30 to-background" />
        </motion.div>

        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 mb-6">
              <Sparkles size={18} className="text-gold" />
              <span className="text-sm font-medium tracking-[0.2em] uppercase text-gold">Premium Parda Saloni</span>
            </motion.div>
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-cream leading-tight max-w-3xl"
            >
              Uyingizga{" "}
              <span className="text-gold-gradient font-semibold italic">nafislik</span>{" "}
              baxsh eting
            </motion.h1>
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 text-cream/70 text-lg max-w-xl leading-relaxed"
            >
              Eng sifatli matolar va zamonaviy dizaynlar bilan uyingizni bezang.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-10">
              <Link
                to="/katalog"
                className="inline-flex items-center gap-3 bg-gold-gradient text-charcoal px-8 py-4 rounded-full font-medium text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-gold/20 transition-all duration-500 group"
              >
                Katalogni ko'rish
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          className="absolute top-1/4 right-10 w-20 h-20 border border-gold/20 rounded-full floating"
          style={{ animationDelay: "0s" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-12 h-12 border border-gold/10 rounded-full floating"
          style={{ animationDelay: "2s" }}
        />
      </section>

      {/* Categories */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-sm tracking-[0.2em] uppercase text-gold font-medium">Kolleksiyalar</span>
            <h2 className="font-heading text-4xl md:text-5xl mt-4 font-light">
              Bizning <span className="text-gold-gradient font-semibold italic">to'plamlar</span>
            </h2>
          </motion.div>

          {categories.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {categories.slice(0, 6).map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.8 }}
                >
                  <Link to={`/katalog?category=${encodeURIComponent(cat.name)}`} className="group block">
                    <div className="relative overflow-hidden rounded-xl aspect-[4/5]">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                        <h3 className="font-heading text-lg md:text-xl text-cream font-semibold">{cat.name}</h3>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Turkey Partnership Banner */}
      <section className="py-16 bg-charcoal-light relative overflow-hidden">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16"
          >
            <div className="flex items-center gap-4">
              <img src={turkeyFlag} alt="Turkiya bayrog'i" className="w-16 h-12 object-contain" loading="lazy" width={64} height={48} />
              <div className="h-12 w-px bg-gold/30 hidden md:block" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-heading text-2xl md:text-3xl text-cream font-light">
                Turkiya <span className="text-gold-gradient font-semibold italic">fabrikalari</span> bilan hamkorlik
              </h3>
              <p className="text-cream/50 mt-2 text-sm md:text-base max-w-lg">
                Matolarimiz to'g'ridan-to'g'ri Turkiyaning yetakchi fabrikalaridan import qilinadi. Sifat va zamonaviy dizayn kafolatlangan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gold animate-pulse" />
              <span className="text-xs uppercase tracking-[0.15em] text-gold/80 font-medium">Rasmiy hamkor</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-charcoal-gradient relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-heading text-4xl md:text-5xl text-cream font-light">
              Bepul <span className="text-gold-gradient font-semibold italic">maslahat</span> oling
            </h2>
            <p className="text-cream/60 mt-4 max-w-lg mx-auto">
              Mutaxassislarimiz sizga eng mos pardani tanlashda yordam beradi.
            </p>
            <a
              href="tel:+998907210909"
              className="inline-flex items-center gap-3 mt-8 border border-gold/40 text-gold px-8 py-4 rounded-full font-medium text-sm tracking-wider uppercase hover:bg-gold hover:text-charcoal transition-all duration-500"
            >
              Bog'lanish
              <ArrowRight size={18} />
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
