export const CONFIG = {
  whatsapp: "573147397938",
  minimoMayorista: 130000,
  adminPassword: "tuyyo4ever",
  scriptsWriteUrl: "https://script.google.com/macros/s/AKfycbwY98-Nu5gSyP0j7ddOyKO7cK4Z9EicR8i6gTMO3Yec2uzIIPQJ0-KBVQj8shcV8b584g/exec",
  logo: "/ilogo-byfly.png",
  brandName: "BYFLY",
  brandSub: "makeup",
  heroTitle: "✨ Aquí comienza tu transformación",
  heroSubtitle:
    "Encuentra las mejores marcas colombianas e importadas al mejor precio",
  heroBadge1: "💰 Mayorista desde $130.000",
  heroBadge2: "🚚 Envíos a toda Colombia",
  heroBadge3: "📦 Despacho 1-2 días hábiles",
  heroBadge4: "📱 @byflymakeup",
  sheetsUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQo4RhtucI4m_U32VCNzNy2E33wCeXeO2NKTcDOFn1mDupdXtPsqDEPF6NFJDYRc6LNWJJpRAZLguIt/pub?gid=1817499306&single=true&output=csv",
  stockBajoUmbral: 1,
  cacheTtlMs: 5 * 60 * 1000,
} as const

export const CAT_ICONS: Record<string, string> = {
  Piel: "🌸",
  Labios: "💋",
  Ojos: "👁️",
  Skincare: "✨",
  Brochas: "🖌️",
  Accesorios: "💎",
  Importados: "🌍",
  Combos: "🎁",
}

export const CATEGORIES = [
  { key: "todos", label: "✨ Todos" },
  { key: "Combos", label: "🎁 Combos" },
  { key: "Piel", label: "🌸 Piel" },
  { key: "Labios", label: "💋 Labios" },
  { key: "Ojos", label: "👁️ Ojos" },
  { key: "Skincare", label: "✨ Skincare" },
  { key: "Brochas", label: "🖌️ Brochas" },
  { key: "Accesorios", label: "💎 Accesorios" },
  { key: "Importados", label: "🌍 Importados" },
]

export const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Bestseller: { bg: "rgba(255,193,7,0.92)", text: "#5d4037" },
  "Viral TikTok": { bg: "rgba(255,87,34,0.92)", text: "#fff" },
  Nuevo: { bg: "rgba(33,150,243,0.92)", text: "#fff" },
  "Agotándose": { bg: "rgba(156,39,176,0.92)", text: "#fff" },
}

export const BADGE_LABELS: Record<string, string> = {
  Bestseller: "⭐ Bestseller",
  "Viral TikTok": "🔥 Viral TikTok",
  Nuevo: "🆕 Nuevo",
  "Agotándose": "⚡ Agotándose",
}
