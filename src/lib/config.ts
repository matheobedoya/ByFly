export const CONFIG = {
  // — Contacto —
  whatsapp: "573147397938",
  instagram: "https://instagram.com/byfly_makeup",

  // — Negocio —
  minimoMayorista: 130000,
  stockBajoUmbral: 1,

  // — Admin —
  adminPassword: "tuyyo4ever",
  scriptsWriteUrl: "https://script.google.com/macros/s/AKfycbwY98-Nu5gSyP0j7ddOyKO7cK4Z9EicR8i6gTMO3Yec2uzIIPQJ0-KBVQj8shcV8b584g/exec",

  // — Marca —
  logo: "/ilogo-byfly.png",
  brandName: "BYFLY",
  brandSub: "makeup",
  brandEmoji: "🌸",

  // — Hero —
  heroTitle: "✨ Aquí comienza tu transformación",
  heroSubtitle: "Encuentra las mejores marcas colombianas e importadas al mejor precio",
  heroBadge1: "💰 Mayorista desde $130.000",
  heroBadge2: "🚚 Envíos a toda Colombia",
  heroBadge3: "📦 Despacho 1-2 días hábiles",
  heroBadge4: "📱 @byflymakeup",

  // — Banners promocionales del hero carousel —
  // img: URL de la imagen (1440×500px WebP recomendado). Dejar "" para mostrar placeholder de color.
  // ctaLink: puede ser "#combos", "#importados", "#labios" o cualquier URL
  heroBanners: [
    {
      id: 1,
      img: "",
      title: "🎁 Combos Especiales",
      subtitle: "Arma tu kit de maquillaje ideal al mejor precio",
      cta: "Ver combos",
      ctaLink: "#",
      bg: "linear-gradient(135deg, #880E4F 0%, #C2185B 55%, #F06292 100%)",
    },
    {
      id: 2,
      img: "",
      title: "🌍 Nuevos Importados",
      subtitle: "Las últimas tendencias internacionales de belleza",
      cta: "Ver importados",
      ctaLink: "#",
      bg: "linear-gradient(135deg, #4A148C 0%, #7B1FA2 55%, #CE93D8 100%)",
    },
    {
      id: 3,
      img: "",
      title: "🚚 Envíos a toda Colombia",
      subtitle: "Despacho en 1-2 días hábiles · Desde $8.000 con Interrapidísimo",
      cta: "Hacer mi pedido",
      ctaLink: "#",
      bg: "linear-gradient(135deg, #B71C1C 0%, #E53935 55%, #EF9A9A 100%)",
    },
  ],

  // — SEO —
  siteUrl: "https://byfly.com.co",
  seoTitle: "BYFLY Makeup — Maquillaje al Detal y Mayorista | Colombia",
  seoDescription: "Compra maquillaje al detal y mayorista en Colombia. Marcas colombianas e importadas, los mejores precios, envíos a todo el país y despacho en 1-2 días hábiles.",
  themeColor: "#C2185B",
  city: "Colombia",
  analyticsId: "",

  // — Modo del sitio —
  siteMode: "catalog" as "catalog" | "services" | "restaurant",

  // — Sección "Quiénes somos" (dejar vacío para ocultarla) —
  aboutTitle: "",
  aboutText: "",

  // — Datos productos —
  sheetsUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQo4RhtucI4m_U32VCNzNy2E33wCeXeO2NKTcDOFn1mDupdXtPsqDEPF6NFJDYRc6LNWJJpRAZLguIt/pub?gid=1817499306&single=true&output=csv",
  cacheTtlMs: 5 * 60 * 1000,

  // — Descuentos (pestaña "Descuentos" en Google Sheets) —
  // Formato CSV: codigo,tipo,valor,minPedido,activo
  // tipo: "porcentaje" o "fijo" | activo: "si" o "no"
  // Ejemplo fila: BYFLY10,porcentaje,10,50000,si
  // Dejar vacío para deshabilitar descuentos
  discountsUrl: "",
}

export const CAT_ICONS: Record<string, string> = {
  // Valores pueden ser emoji O ruta de imagen ("/icons/piel.png") O URL externa.
  // Tamaño recomendado para imágenes: 200×200 px PNG/WebP con fondo transparente.
  Piel: "🌸",
  Labios: "💋",
  Ojos: "👁️",
  Skincare: "✨",
  Brochas: "🖌️",
  Accesorios: "💎",
  Importados: "🌍",
  Combos: "🎁",
  "Cuidado corporal": "🛁",
}

export const CATEGORIES = [
  { key: "todos",              label: "✨ Todos",            name: "Todos" },
  { key: "badge:Nuevo",        label: "🆕 Lo más nuevo",     name: "Lo más nuevo" },
  { key: "badge:Viral TikTok", label: "🔥 Tendencia",        name: "Tendencia" },
  { key: "Combos",             label: "🎁 Combos",           name: "Combos" },
  { key: "Piel",               label: "🌸 Piel",             name: "Piel" },
  { key: "Labios",             label: "💋 Labios",           name: "Labios" },
  { key: "Ojos",               label: "👁️ Ojos",            name: "Ojos" },
  { key: "Skincare",           label: "✨ Skincare",         name: "Skincare" },
  { key: "Brochas",            label: "🖌️ Brochas",         name: "Brochas" },
  { key: "Accesorios",         label: "💎 Accesorios",       name: "Accesorios" },
  { key: "Importados",         label: "🌍 Importados",       name: "Importados" },
  { key: "Cuidado corporal",   label: "🛁 Cuidado corporal", name: "Cuidado corporal" },
]

export const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Bestseller:      { bg: "rgba(255,193,7,0.92)",   text: "#5d4037" },
  "Viral TikTok":  { bg: "rgba(255,87,34,0.92)",   text: "#fff" },
  Nuevo:           { bg: "rgba(33,150,243,0.92)",   text: "#fff" },
  "Agotándose":    { bg: "rgba(156,39,176,0.92)",   text: "#fff" },
}

export const BADGE_LABELS: Record<string, string> = {
  Bestseller:     "⭐ Bestseller",
  "Viral TikTok": "🔥 Viral TikTok",
  Nuevo:          "🆕 Nuevo",
  "Agotándose":   "⚡ Agotándose",
}
