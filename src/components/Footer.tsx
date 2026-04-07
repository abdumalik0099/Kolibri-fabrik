import { Link } from "react-router-dom";
import { Phone, MapPin, Send, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import kolibriLogo from "@/assets/kolibri-logo.png";

const socialLinks = [
  {
    label: "Telegram",
    href: "https://t.me/Kolibri_fabric",
    icon: <Send size={18} />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/kolibri_fabric",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
];

const phoneNumbers = [
  { number: "+998 90 721 09 09", href: "tel:+998907210909" },
  { number: "+998 91 460 09 09", href: "tel:+998914600909" },
];

export default function Footer() {
  return (
    <footer className="relative bg-charcoal text-cream overflow-hidden">
      {/* Decorative top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Shimmer accent */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-gold/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 pt-16 pb-8 relative">
        {/* Top section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <img
              src={kolibriLogo}
              alt="Kolibri Fabric"
              className="h-14 mb-5 brightness-0 invert opacity-90"
            />
            <p className="text-cream/50 text-sm leading-relaxed max-w-xs">
              Hashamatli pardalar bilan uyingizni bezang.
              <br />
              Sifat va nafislik – bizning ustuvorimiz.
            </p>

            {/* Social links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-xl bg-cream/[0.06] border border-cream/10 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold/30 hover:bg-gold/[0.08] transition-all duration-300"
                  title={s.label}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3 lg:col-start-6">
            <h4 className="text-xs tracking-[0.25em] uppercase text-gold/70 font-medium mb-5">
              Sahifalar
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { label: "Bosh sahifa", path: "/" },
                { label: "Katalog", path: "/katalog" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="group flex items-center gap-1.5 text-sm text-cream/50 hover:text-cream transition-colors duration-300"
                >
                  {link.label}
                  <ArrowUpRight
                    size={13}
                    className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-gold"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h4 className="text-xs tracking-[0.25em] uppercase text-gold/70 font-medium mb-5">
              Biz bilan bog'laning
            </h4>
            <div className="flex flex-col gap-4">
              {phoneNumbers.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  className="group flex items-center gap-3 text-sm text-cream/50 hover:text-cream transition-colors duration-300"
                >
                  <span className="w-9 h-9 rounded-lg bg-cream/[0.06] border border-cream/10 flex items-center justify-center group-hover:border-gold/30 group-hover:bg-gold/[0.08] transition-all duration-300">
                    <Phone size={15} className="text-gold/70" />
                  </span>
                  {p.number}
                </a>
              ))}
              <a
                href="https://maps.google.com/?q=38.8478920,65.7980287"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 text-sm text-cream/50 hover:text-cream transition-colors duration-300"
              >
                <span className="w-9 h-9 rounded-lg bg-cream/[0.06] border border-cream/10 flex items-center justify-center group-hover:border-gold/30 group-hover:bg-gold/[0.08] transition-all duration-300">
                  <MapPin size={15} className="text-gold/70" />
                </span>
                Toshkent, O'zbekiston
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-cream/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cream/30">
            © {new Date().getFullYear()} Kolibri Fabric. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cream/30 hover:text-gold/60 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
