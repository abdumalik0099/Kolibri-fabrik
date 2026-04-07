import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { getCategories, Category } from "@/lib/categories";
import kolibriLogo from "@/assets/kolibri-logo.png";

const staticLinks = [
  { label: "Bosh sahifa", path: "/" },
  { label: "Katalog", path: "/katalog" },
];

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={kolibriLogo} alt="Kolibri Fabric" className="h-10 md:h-12" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-10">
          {staticLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative text-sm font-medium tracking-[0.15em] uppercase transition-colors duration-300 ${
                location.pathname === item.path
                  ? "text-gold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {location.pathname === item.path && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-gradient rounded-full"
                />
              )}
            </Link>
          ))}

          {/* Categories dropdown */}
          {categories.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setCatOpen(true)}
              onMouseLeave={() => setCatOpen(false)}
            >
              <button className="text-sm font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center gap-1.5">
                Kategoriyalar
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${catOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 glass rounded-2xl overflow-hidden min-w-[240px] shadow-xl border border-border/50"
                  >
                    <div className="p-2">
                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/katalog?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setCatOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/60 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden ring-1 ring-border/30 group-hover:ring-gold/40 transition-all">
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium tracking-wide">{cat.name}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground p-1"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Menu size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden glass border-t border-border/30"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {staticLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium tracking-[0.15em] uppercase transition-colors ${
                    location.pathname === item.path ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {categories.length > 0 && (
                <>
                  <div className="h-px bg-border/30 my-1" />
                  <span className="text-xs tracking-[0.2em] uppercase text-gold/50">
                    Kategoriyalar
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/katalog?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                      >
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <span className="text-xs font-medium">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <div className="h-px bg-border/30 my-1" />
              <div className="flex flex-col gap-2.5">
                <a href="tel:+998907210909" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                  📞 +998 90 721 09 09
                </a>
                <a href="tel:+998914600909" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                  📞 +998 91 460 09 09
                </a>
                <div className="flex gap-3 mt-1">
                  <a
                    href="https://t.me/Kolibri_fabric"
                    target="_blank"
                    className="text-xs font-medium tracking-wider uppercase px-4 py-2 rounded-lg border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
                  >
                    Telegram
                  </a>
                  <a
                    href="https://www.instagram.com/kolibri_fabric"
                    target="_blank"
                    className="text-xs font-medium tracking-wider uppercase px-4 py-2 rounded-lg border border-border/50 text-muted-foreground hover:border-gold hover:text-gold transition-colors"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
