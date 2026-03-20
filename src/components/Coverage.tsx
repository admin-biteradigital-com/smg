"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { track } from "@vercel/analytics";
import { ZONES, whatsappLink, WHATSAPP_MESSAGES } from "@/lib/constants";

export default function Coverage() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute top-0 right-[-10%] w-[400px] h-[400px] bg-[var(--orange)] opacity-[0.03] rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--orange)] mb-4 block">
              Cobertura
            </span>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight mb-5">
              Desde la base hasta{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
                Hornopirén
              </span>
            </h2>
            <p className="text-[var(--muted)] text-[0.95rem] leading-relaxed mb-8 max-w-[440px]">
              Nuestra flota recorre la <strong className="text-white">Carretera Austral</strong> diariamente,
              abasteciendo negocios a lo largo de 11 localidades de la Región de Los Lagos.
            </p>

            <a
              href={whatsappLink(WHATSAPP_MESSAGES.coverage)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { location: "coverage", type: "zone_inquiry" })}
              className="inline-flex items-center gap-2 text-[var(--orange)] hover:text-[#FFB366] text-[0.88rem] font-bold transition-colors"
            >
              <MapPin className="w-4 h-4" />
              ¿No ves tu zona? Consultanos
            </a>
          </motion.div>

          {/* Right: Zone tags */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex flex-wrap gap-3"
          >
            {ZONES.map((zone) => (
              <span
                key={zone.name}
                className={`text-[0.82rem] font-semibold px-5 py-2.5 rounded-full border transition-all duration-300 cursor-default ${
                  "highlighted" in zone && zone.highlighted
                    ? "bg-[var(--orange)]/10 border-[var(--orange)]/30 text-[var(--orange)]"
                    : "glass border-[var(--glass-border)] text-[var(--muted)] hover:text-white hover:border-white/20"
                }`}
              >
                {zone.name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
