// ── SMG Global Constants ──────────────────────────
// Centralised so that changes propagate immediately across all components.

export const WHATSAPP_NUMBER = "56985144771";

export const whatsappLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const WHATSAPP_MESSAGES = {
  general: "Hola SMG, quiero consultar",
  order: "Hola SMG, quiero pedir productos",
  firstOrder: "Hola SMG, quiero hacer mi primer pedido",
  coverage: "Hola SMG, quiero saber si llegan a mi zona",
} as const;

export const ZONES = [
  { name: "Frutillar", highlighted: true },
  { name: "Llanquihue" },
  { name: "Puerto Varas" },
  { name: "Puerto Montt" },
  { name: "Quillaipe" },
  { name: "Lenca" },
  { name: "La Arena" },
  { name: "Caleta Puelche" },
  { name: "Contao" },
  { name: "Hornopirén", highlighted: true },
] as const;

export const MACRO_CATEGORIES = [
  { name: "Chocolates", emoji: "🍫", sub: "Barras, bombones, tabletas" },
  { name: "Snacks & Galletas", emoji: "🥨", sub: "Papas, saladas, dulces" },
  { name: "Chicles", emoji: "🫧", sub: "Displays y unidades" },
  { name: "Pastillas", emoji: "🍬", sub: "Mentoladas, frutales" },
  { name: "Gomitas & Chupetines", emoji: "🍭", sub: "Surtidas por bolsa" },
  { name: "Café & Bebidas", emoji: "☕", sub: "Instantáneo y energizante" },
  { name: "Repostería", emoji: "🧁", sub: "Cobertura y decoración" },
  { name: "Caramelos & Tubitos", emoji: "🍿", sub: "Variedad de sabores" },
] as const;

export const STATS = [
  { value: "+100", label: "Productos disponibles" },
  { value: "Rutas", label: "Cobertura regional directa" },
  { value: "DTE", label: "Facturación electrónica SII" },
] as const;

export const BRANDS = [
  "Trento",
  "Bel",
  "Montevergine",
  "Mantecol",
  "Entre Ríos",
  "Talento (Garoto)",
  "Richester",
  "Marilan / Pit-Stop",
  "Kryzpo",
  "Freegells",
  "Jazam",
  "Gold Café",
] as const;
