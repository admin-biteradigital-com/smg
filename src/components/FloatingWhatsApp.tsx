"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import WhatsAppIcon from "./WhatsAppIcon";
import { whatsappLink, WHATSAPP_MESSAGES } from "@/lib/constants";

export default function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show the floating button after scrolling down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      href={whatsappLink(WHATSAPP_MESSAGES.general)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      onClick={() => track("whatsapp_click", { location: "floating_widget", type: "general" })}
      className={`fixed bottom-6 right-6 z-[100] flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-[0_8px_32px_rgba(37,211,102,0.45)] transition-all duration-300 hover:scale-[1.1] hover:shadow-[0_12px_40px_rgba(37,211,102,0.55)] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      }
      group`}
    >
      <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-30 group-hover:opacity-0" />
      <WhatsAppIcon className="w-7 h-7 fill-white relative z-10" />
      
      {/* Tooltip */}
      <div className="absolute right-full mr-4 bg-white text-[var(--navy)] text-[0.8rem] font-bold px-3 py-1.5 rounded-lg shadow-xl opacity-0 translate-x-4 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
        Escribinos
      </div>
    </a>
  );
}
