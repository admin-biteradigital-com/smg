"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { track } from "@vercel/analytics";
import WhatsAppIcon from "./WhatsAppIcon";
import { whatsappLink, WHATSAPP_MESSAGES, STATS } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Mesh gradient background ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy-deep)] via-[var(--navy-mid)] to-[var(--navy-deep)]" />
        <div
          className="absolute top-[-30%] right-[-20%] w-[80vw] h-[80vw] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, var(--orange) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #4A90D9 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-28 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left: Copy */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <span className="inline-block text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--orange)] mb-4">
              Distribuidora · Región de Los Lagos
            </span>
            <h1 className="text-[clamp(2.4rem,5vw,4rem)] leading-[1.08] font-bold tracking-tight">
              Golosinas que{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
                llegan
              </span>
              <br />a tu negocio
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-[1.05rem] text-[var(--muted)] leading-relaxed max-w-[480px]"
          >
            Más de <strong className="text-white">100 productos</strong> de las marcas más buscadas.
            Autoventa puerta a puerta desde Frutillar hasta Hornopirén, con facturación electrónica SII.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="flex flex-wrap items-center gap-4"
          >
            <a
              href={whatsappLink(WHATSAPP_MESSAGES.firstOrder)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { location: "hero_primary", type: "first_order" })}
              className="group inline-flex items-center gap-3 bg-[var(--orange)] text-white font-bold text-[0.95rem] px-7 py-4 rounded-full shadow-[0_8px_32px_rgba(244,121,32,0.3)] transition-all duration-300 hover:shadow-[0_12px_44px_rgba(244,121,32,0.45)] hover:translate-y-[-2px]"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
              Hacer mi primer pedido
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={whatsappLink(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { location: "hero_secondary", type: "consultation" })}
              className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-white text-[0.88rem] font-medium transition-colors"
            >
              Solo quiero consultar
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex gap-8 pt-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="text-[1.6rem] font-bold text-[var(--orange)]">{s.value}</div>
                <div className="text-[0.72rem] text-[var(--muted)] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Profile visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative flex items-center justify-center"
        >
          <div className="relative w-[320px] h-[320px] lg:w-[400px] lg:h-[400px]">
            {/* Glow ring */}
            <div
              className="absolute inset-[-8%] rounded-full opacity-30"
              style={{
                background: "conic-gradient(from 0deg, var(--orange), transparent 30%, transparent 70%, var(--orange))",
                animation: "pulse-ring 3s ease-in-out infinite",
              }}
            />
            {/* Glass circle */}
            <div className="absolute inset-0 rounded-full glass" />
            {/* Profile image */}
            <Image
              src="/assets/perfil.png"
              alt="SMG Distribuciones — Perfil"
              fill
              className="object-cover rounded-full p-3"
              sizes="(max-width: 1024px) 320px, 400px"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
