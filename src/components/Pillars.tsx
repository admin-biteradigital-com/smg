"use client";

import { motion } from "framer-motion";
import { Package, Truck, BadgeDollarSign } from "lucide-react";

const PILLARS = [
  {
    icon: Package,
    title: "Variedad garantizada",
    desc: "Más de 100 SKUs: chocolates, snacks, chicles, gomitas, café y más. Todo lo que tu negocio necesita en un solo proveedor.",
    accent: "from-[#F47920] to-[#FFB366]",
  },
  {
    icon: Truck,
    title: "Autoventa en ruta",
    desc: "Llegamos a tu puerta. Desde Frutillar hasta Hornopirén, nuestra flota recorre la Carretera Austral para abastecerte sin que muevas un dedo.",
    accent: "from-[#4A90D9] to-[#6ABAFF]",
  },
  {
    icon: BadgeDollarSign,
    title: "Precios de fábrica",
    desc: "Importamos directo y distribuimos sin intermediarios. Precios competitivos con facturación electrónica SII incluida.",
    accent: "from-[#34D399] to-[#6EE7B7]",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Pillars() {
  return (
    <section className="relative py-28 overflow-hidden bg-[var(--navy-deep)]">
      {/* ── Panoramic background ── */}
      <div className="absolute inset-0 z-0 bg-[url('/assets/pillars_rio.png')] bg-cover bg-bottom bg-no-repeat opacity-[0.15] mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-deep)] via-transparent to-[var(--navy-deep)] z-0" />

      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--orange)] opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--orange)]">
            Qué ofrecemos
          </span>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold mt-3 tracking-tight">
            Tu distribuidora de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
              confianza
            </span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PILLARS.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="group relative glass glass-hover rounded-2xl p-8 transition-all duration-500 hover:translate-y-[-4px]"
            >
              {/* Gradient line top */}
              <div className={`absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full`} />

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center mb-6 shadow-lg`}>
                <p.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-[1.15rem] font-bold mb-3">{p.title}</h3>
              <p className="text-[0.88rem] text-[var(--muted)] leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
