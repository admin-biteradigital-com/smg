import type { Metadata } from "next";
import { Sora, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "SMG — Bueno, Rico y Barato | Distribución de Golosinas en Los Lagos",
  description:
    "Distribución de golosinas y snacks al por mayor en la Región de Los Lagos. Abastecemos Frutillar, Puerto Varas, Puerto Montt y la Carretera Austral hasta Hornopirén. Facturación y Autoventa.",
  keywords: [
    "golosinas", "snacks", "distribuidora mayorista", "Los Lagos",
    "Carretera Austral", "kioscos", "minimarkets", "SMG",
  ],
  metadataBase: new URL("https://smg.biteradigital.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SMG Distribuciones — Bueno, Rico y Barato",
    description: "Distribución directa al por mayor de golosinas y snacks comerciales en la Región de Los Lagos.",
    url: "https://smg.biteradigital.com",
    siteName: "SMG Distribuciones",
    images: [
      {
        url: "/assets/portada.webp",
        width: 1200,
        height: 630,
        alt: "SMG Distribuciones Portada",
      },
    ],
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SMG Distribuciones",
    description: "Autoventa directa de golosinas en la Región de Los Lagos.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "SMG Distribuciones",
  "logo": "https://smg.biteradigital.com/assets/logo.webp",
  "image": "https://smg.biteradigital.com/assets/logo.webp",
  "description": "Distribuidora mayorista de snacks, golosinas y abarrotes en la Región de Los Lagos, Chile con rutas por la Carretera Austral.",
  "url": "https://smg.biteradigital.com",
  "telephone": "+56985144771",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Puerto Montt (Chamiza)",
    "addressRegion": "Región de Los Lagos",
    "addressCountry": "CL"
  },
  "areaServed": [
    "Frutillar", "Llanquihue", "Puerto Varas", "Puerto Montt", "Quillaipe",
    "Lenca", "La Arena", "Caleta Puelche", "Contao", "Hornopirén"
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${sora.variable} ${instrumentSerif.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        {children}
        <FloatingWhatsApp />
        <Analytics />
      </body>
    </html>
  );
}
