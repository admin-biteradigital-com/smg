"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { BRANDS } from "@/lib/constants";

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Confianza probada",
    desc: "Representamos marcas líderes de la región únicamente. Cada producto pasa por nuestro estricto control de calidad.",
  },
  {
    icon: Zap,
    title: "Rutas semanales",
    desc: "Tenemos una ruta establecida que repetimos todas las semanas, visitando cada localidad a fondo en un día específico.",
  },
  {
    icon: BarChart3,
    title: "Impulso comercial",
    desc: "Te ayudamos a rotar stock con productos de alta demanda y márgenes atractivos.",
  },
];

export default function WhyUs() {
  return (
    <section className="relative py-28 overflow-hidden bg-[var(--navy-deep)]">
      {/* ── Panoramic background ── */}
      <div className="absolute inset-0 z-0 bg-[url('/assets/frutillar_view.png')] bg-cover bg-bottom bg-no-repeat opacity-20 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-deep)] via-transparent to-[var(--navy-deep)] z-0" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--orange)] opacity-[0.05] rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--orange)]">
            Diferencial
          </span>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold mt-3 tracking-tight">
            ¿Por qué elegir{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
              SMG
            </span>
            ?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {REASONS.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="glass glass-hover rounded-2xl p-7 transition-all duration-500 hover:translate-y-[-3px]"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center mb-5">
                <r.icon className="w-5 h-5 text-[var(--orange)]" />
              </div>
              <h3 className="text-[1.05rem] font-bold mb-2">{r.title}</h3>
              <p className="text-[0.85rem] text-[var(--muted)] leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Brands */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass rounded-2xl p-8"
        >
          <div className="text-center mb-6">
            <span className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--muted)]">
              Nuestras marcas
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {BRANDS.map((b) => (
              <span
                key={b}
                className="text-[0.78rem] font-semibold px-4 py-2 rounded-full border border-[var(--glass-border)] text-[var(--muted)] hover:text-[var(--orange)] hover:border-[var(--orange)]/30 transition-all duration-300 cursor-default"
              >
                {b}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
