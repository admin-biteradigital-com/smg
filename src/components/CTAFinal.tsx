"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { track } from "@vercel/analytics";
import WhatsAppIcon from "./WhatsAppIcon";
import { whatsappLink, WHATSAPP_MESSAGES } from "@/lib/constants";

export default function CTAFinal() {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background gradient pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, var(--orange) 0%, transparent 70%)",
            animation: "gradient-shift 6s ease infinite",
            backgroundSize: "200% 200%",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[700px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-tight">
            ¿Listo para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
              abastecer
            </span>{" "}
            tu negocio?
          </h2>

          <p className="text-[var(--muted)] text-[1.05rem] leading-relaxed max-w-[520px] mx-auto">
            Escribinos por WhatsApp y recibí tu pedido en la puerta.
            Sin mínimos, sin complicaciones, con factura electrónica.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappLink(WHATSAPP_MESSAGES.order)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { location: "cta_final", type: "order" })}
              className="group inline-flex items-center gap-3 bg-[var(--orange)] text-white font-bold text-[1rem] px-8 py-4.5 rounded-full shadow-[0_8px_40px_rgba(244,121,32,0.35)] transition-all duration-300 hover:shadow-[0_16px_56px_rgba(244,121,32,0.5)] hover:translate-y-[-3px]"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
              Pedir productos ahora
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <p className="text-[0.75rem] text-[var(--muted)]/60">
            Horario: Lunes a Viernes · Respuesta en minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
