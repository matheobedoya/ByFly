import { CONFIG } from "@/lib/config"
import type { Product } from "@/types"

/**
 * Reemplaza todo el catálogo en Google Sheets via Apps Script Web App.
 * Fire-and-forget con mode: no-cors — no requiere respuesta.
 * Solo actúa si CONFIG.scriptsWriteUrl está configurado.
 */
export function writeToSheets(products: Product[]): void {
  if (!CONFIG.scriptsWriteUrl) return
  try {
    fetch(CONFIG.scriptsWriteUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "replace_catalog",
        token: CONFIG.adminPassword,
        products: products.map((p) => ({
          name: p.name,
          brand: p.brand || "",
          cat: p.cat,
          detal: p.detal || "",
          mayor: p.mayor || "",
          img1: p.img1 || "",
          img2: p.img2 || "",
          img3: p.img3 || "",
          surtido: p.surtido,
          badge: p.badge || "",
          variantes: p.variantes.map((v) => ({
            tono: v.tono || "",
            disponible: v.disponible,
            stock: v.stock,
          })),
        })),
      }),
    })
  } catch {
    // Silencioso — el estado local ya está actualizado
  }
}
