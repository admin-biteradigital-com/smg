"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, MapPin, Store, FileText, CheckCircle2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { track } from "@vercel/analytics";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import WhatsAppIcon from "./WhatsAppIcon";

const onboardingSchema = z.object({
  businessName: z.string().min(3, "La razón social o nombre local es obligatorio"),
  rut: z.string().min(8, "Ingresa un RUT válido (ej. 76.XXX.XXX-X)").max(12),
  address: z.string().min(5, "La dirección exacta es requerida para logística"),
  phone: z.string().min(8, "Ingresa un teléfono de contacto válido"),
  businessType: z.enum(["Kiosco", "Minimarket", "Almacén", "Mayorista", "Otro"]),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar la Política de Privacidad",
  }),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function OnboardingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: { businessType: "Minimarket" },
  });

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    track("b2b_form_submitted", { business_type: data.businessType });

    try {
      // 1. Post to Cloudflare Pages Function → D1 Database (Sprint 6)
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
    } catch {
      console.error("Backend warning, continuing to WhatsApp fallback.");
    }

    // 2. Format Structured Payload for Sales Team
    const message = `*📍 NUEVO CLIENTE (ALTA COMERCIAL)*\n\nHola SMG, quiero registrar mi negocio para comenzar a operar. Aquí están mis datos facturables:\n\n🏢 *Datos Comerciales:*\n- Razón Social: ${data.businessName}\n- RUT: ${data.rut}\n- Rubro: ${data.businessType}\n\n🚚 *Logística:*\n- Dirección: ${data.address}\n- Fono Contacto: ${data.phone}\n\nQuedo atento para que validen mi alta y ver listados de precios.`;

    // 3. Fallback WhatsApp Redirect
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    setTimeout(() => {
      window.open(url, "_blank");
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <section className="relative py-28 overflow-hidden bg-[var(--navy-deep)]" id="alta-cliente">
      {/* ── Panoramic background ── */}
      <div className="absolute inset-0 z-0 bg-[url('/assets/onboarding_oceano.png')] bg-cover bg-top bg-no-repeat opacity-[0.25] mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--navy-deep)] via-[var(--navy-deep)]/60 to-[var(--navy-deep)] z-0" />

      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[var(--orange)] opacity-[0.04] rounded-full blur-[120px] -translate-y-1/2 z-0 pointer-events-none" />

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
              Red Mayorista
            </span>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight mb-5 leading-tight">
              Abre tu cuenta de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--orange)] to-[#FFB366]">
                cliente
              </span>
            </h2>
            <p className="text-[var(--muted)] text-[0.95rem] leading-relaxed mb-8 max-w-[480px]">
              Al registrarte formalmente, accedes a precios preferentes, rutas de visita comercial y nuestro catálogo 100% actualizado. Prepará tu RUT y unite a los más de 500 locales de Los Lagos.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                "Atención prioritaria y autoventa planificada.",
                "Facturación electrónica estandarizada SII.",
                "Acceso a lanzamientos y descuentos de marca.",
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-[0.85rem] text-[var(--muted)]">
                  <CheckCircle2 className="w-5 h-5 text-[var(--orange)] shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: Glass Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass rounded-2xl p-8 shadow-2xl relative"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30 rounded-2xl pointer-events-none" />

            <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {/* Business Name */}
                 <div className="space-y-1.5">
                   <label className="text-[0.75rem] font-bold text-[var(--slate)] uppercase tracking-wide flex items-center gap-2">
                     <Store className="w-3.5 h-3.5" /> Razón Social / Local
                   </label>
                   <input
                     {...register("businessName")}
                     className="w-full bg-[var(--navy-mid)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[0.88rem] text-white focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-all"
                     placeholder="Ej. Comercializadora Sur"
                   />
                   {errors.businessName && <p className="text-red-400 text-[0.7rem]">{errors.businessName.message}</p>}
                 </div>

                 {/* RUT */}
                 <div className="space-y-1.5">
                   <label className="text-[0.75rem] font-bold text-[var(--slate)] uppercase tracking-wide flex items-center gap-2">
                     <FileText className="w-3.5 h-3.5" /> RUT Comercial
                   </label>
                   <input
                     {...register("rut")}
                     className="w-full bg-[var(--navy-mid)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[0.88rem] text-white focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-all"
                     placeholder="xx.xxx.xxx-x"
                   />
                   {errors.rut && <p className="text-red-400 text-[0.7rem]">{errors.rut.message}</p>}
                 </div>
               </div>

               {/* Address */}
               <div className="space-y-1.5">
                 <label className="text-[0.75rem] font-bold text-[var(--slate)] uppercase tracking-wide flex items-center gap-2">
                   <MapPin className="w-3.5 h-3.5" /> Dirección (Incluir Localidad)
                 </label>
                 <input
                   {...register("address")}
                   className="w-full bg-[var(--navy-mid)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[0.88rem] text-white focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-all"
                   placeholder="Ej. Av. Pedro Montt 123, Frutillar"
                 />
                 {errors.address && <p className="text-red-400 text-[0.7rem]">{errors.address.message}</p>}
               </div>

               {/* Phone */}
               <div className="space-y-1.5">
                 <label className="text-[0.75rem] font-bold text-[var(--slate)] uppercase tracking-wide">
                   Teléfono / Celular
                 </label>
                 <input
                   {...register("phone")}
                   className="w-full bg-[var(--navy-mid)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[0.88rem] text-white focus:outline-none focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange)] transition-all"
                   placeholder="+56 9 XXXXXXXX"
                 />
                 {errors.phone && <p className="text-red-400 text-[0.7rem]">{errors.phone.message}</p>}
               </div>

               {/* Business Type */}
               <div className="space-y-1.5 pb-2">
                 <label className="text-[0.75rem] font-bold text-[var(--slate)] uppercase tracking-wide">
                   Tipo de Negocio
                 </label>
                 <select
                   {...register("businessType")}
                   className="w-full bg-[var(--navy-mid)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[0.88rem] text-white focus:outline-none focus:border-[var(--orange)] transition-all appearance-none"
                 >
                   <option value="Minimarket">Minimarket</option>
                   <option value="Kiosco">Kiosco / Almacén</option>
                   <option value="Mayorista">Distribuidor / Mayorista</option>
                   <option value="Otro">Otro (Especifique al contactar)</option>
                 </select>
               </div>

               {/* GDPR Terms & Turnstile */}
               <div className="space-y-4 pb-2">
                 <label className="flex items-start gap-3 cursor-pointer">
                   <div className="flex items-center h-5 mt-0.5">
                     <input
                       type="checkbox"
                       {...register("acceptTerms")}
                       className="w-4 h-4 bg-[var(--navy-mid)] border-[var(--glass-border)] rounded text-[var(--orange)] focus:ring-[var(--orange)] focus:ring-offset-[var(--navy-deep)]"
                     />
                   </div>
                   <div className="text-[0.75rem] text-[var(--muted)] leading-tight">
                     Confirmo que he leído y acepto la{" "}
                     <a href="/privacy-policy" target="_blank" className="text-[var(--orange)] underline hover:text-[#FFB366] transition-colors">
                       Política de Privacidad
                     </a>{" "}
                     y autorizo el almacenamiento de mis datos para gestión comercial (GDPR/ISO 27701).
                   </div>
                 </label>
                 {errors.acceptTerms && <p className="text-red-400 text-[0.7rem]">{errors.acceptTerms.message}</p>}
                 
                 {/* Cloudflare Turnstile */}
                 <div className="flex justify-center w-full min-h-[65px]">
                   <Turnstile
                     siteKey="1x00000000000000000000AA"
                     onSuccess={(token) => setTurnstileToken(token)}
                     options={{ theme: "dark" }}
                   />
                 </div>
               </div>

               {/* Submit State */}
               <button
                 type="submit"
                 disabled={isSubmitting || !isValid || !turnstileToken}
                 className="w-full flex items-center justify-center gap-3 bg-[var(--orange)] disabled:bg-[var(--navy-mid)] disabled:text-[var(--muted)] text-white font-bold text-[0.95rem] py-4.5 rounded-xl shadow-[0_8px_32px_rgba(244,121,32,0.3)] transition-all duration-300 hover:shadow-[0_12px_44px_rgba(244,121,32,0.45)] hover:-translate-y-1 active:scale-[0.98]"
               >
                 {isSubmitting ? (
                   <span className="animate-pulse">Estructurando Alta Comercial...</span>
                 ) : (
                   <>
                     <WhatsAppIcon className="w-5 h-5 fill-current" />
                     Enviar Alta a Ventas
                     <Send className="w-4 h-4" />
                   </>
                 )}
               </button>
               <p className="text-center text-[0.65rem] text-[var(--muted)]/70">
                 Al dar click, serás redirigido a WhatsApp con tus datos pre-escritos para su procesamiento en el CRM (SIGLO).
               </p>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
