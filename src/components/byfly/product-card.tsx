"use client"

import { useStore, getVariante, isProductAgotado } from "@/contexts/store"
import { BADGE_STYLES, BADGE_LABELS, CONFIG } from "@/lib/config"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { ProductGallery } from "./product-gallery"
import type { Product } from "@/types"

const isServiceMode = CONFIG.siteMode === "services" || CONFIG.siteMode === "restaurant"
const variantLabel = CONFIG.siteMode === "services" ? "Elige una opción:" : CONFIG.siteMode === "restaurant" ? "Elige tamaño:" : "Elige un tono:"
const ctaLabel = CONFIG.siteMode === "restaurant" ? "Pedir por WhatsApp 🛒" : "Consultar por WhatsApp"

function openServiceWhatsApp(p: Product, option: string) {
  const mode = CONFIG.siteMode
  const intro = mode === "restaurant" ? "Quisiera ordenar" : "Me interesa el servicio"
  let msg = `${CONFIG.brandEmoji} *${intro}: ${p.name}*`
  if (option) msg += `\n— Opción: *${option}*`
  msg += `\n\n¡Hola! ¿Me pueden dar más información? 😊`
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank")
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product: p }: ProductCardProps) {
  const { state, dispatch, addToCart } = useStore()
  const { priceMode, selectedTones, quantities } = state

  const selTono = selectedTones[p.id] || ""
  const qty = quantities[p.id] || 1
  const agotado = isProductAgotado(p)

  const variantesConTono = p.variantes.filter((v) => v.tono)
  const tieneVariantesTono = variantesConTono.length > 0
  const varSel = tieneVariantesTono && selTono ? getVariante(p, selTono) : null
  const tonoSelAgotado =
    varSel && (!varSel.disponible || varSel.stock === 0)
  const needTono = tieneVariantesTono && !selTono && !p.surtido

  // Stock alert for selected tone
  let stockInfo = ""
  if (varSel && varSel.stock !== null && varSel.stock === CONFIG.stockBajoUmbral) {
    stockInfo = "⚡ ¡Última unidad!"
  }

  // Prices
  const price = priceMode === "detal" ? p.detal : p.mayor
  const altPrice = priceMode === "detal" ? p.mayor : p.detal
  const dp = price ?? altPrice
  if (!dp) return null

  const saving =
    priceMode === "mayor" && p.detal && p.mayor ? p.detal - p.mayor : 0

  const inCart = state.cart.some(
    (c) => c.id === p.id && c.tono === selTono
  )
  const btnDisabled = agotado || needTono || !!tonoSelAgotado

  const btnLabel = agotado
    ? "❌ Agotado"
    : tonoSelAgotado
    ? "❌ Tono agotado"
    : needTono
    ? "👆 Elige tono"
    : inCart
    ? "✓ En carrito"
    : "Agregar 🛒"

  return (
    <div
      className={`bg-white rounded-[18px] border-[1.5px] border-[#f5e0e8] overflow-hidden flex flex-col transition-all duration-[220ms] hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(194,24,91,0.18)] hover:border-pink-mid ${
        agotado ? "opacity-70" : ""
      }`}
    >
      {/* Gallery with overlay badges */}
      <div className="relative">
        <ProductGallery product={p} />

        {p.badge && BADGE_STYLES[p.badge] && (
          <div
            className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-[20px] text-[10px] font-bold uppercase tracking-[0.5px] z-[2]"
            style={{
              background: BADGE_STYLES[p.badge].bg,
              color: BADGE_STYLES[p.badge].text,
            }}
          >
            {BADGE_LABELS[p.badge] || p.badge}
          </div>
        )}

        {p.surtido && !agotado && (
          <div className="absolute top-2.5 right-2.5 bg-[rgba(255,249,196,0.95)] text-[#f57f17] rounded-[6px] text-[10px] font-semibold px-2 py-[3px] border border-[rgba(245,127,23,0.3)] z-[2]">
            ⚠️ Surtido
          </div>
        )}

        {agotado && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[3]">
            <span className="text-white text-[13px] font-bold tracking-[2px] bg-black/50 px-4 py-1.5 rounded-[20px] border-[1.5px] border-white/40">
              AGOTADO
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="p-[10px_10px_12px] flex-1 flex flex-col min-w-0">
        {p.brand && (
          <div className="text-[10px] text-pink font-semibold uppercase tracking-[1.5px] mb-[3px]">
            {p.brand}
          </div>
        )}
        <div className="text-sm font-medium text-[#1a1a2e] leading-[1.35] mb-2.5 flex-1">
          {p.name}
        </div>

        {/* Price row */}
        <div className="flex justify-between items-end mb-2.5">
          <div>
            <div className="text-[9px] text-[#9e9e9e] uppercase tracking-[0.5px] mb-[1px]">
              {priceMode === "detal" ? "Detal" : "Mayorista"}
            </div>
            <div className="font-serif text-lg font-semibold text-pink-dark">
              $
              <AnimatedNumber
                value={dp}
                format={(n) => Math.round(n).toLocaleString("es-CO")}
                stiffness={120}
                damping={20}
              />
            </div>
            {saving > 0 && (
              <div className="text-[10px] text-[#2e7d32] font-semibold bg-[#e8f5e9] px-[7px] py-[2px] rounded-[10px] mt-[2px] inline-block">
                Ahorras ${saving.toLocaleString("es-CO")}
              </div>
            )}
          </div>
          {altPrice && (
            <div className="text-right">
              <div className="text-[9px] text-[#9e9e9e] uppercase tracking-[0.5px] mb-[1px]">
                {priceMode === "detal" ? "Mayor" : "Detal"}
              </div>
              <div className="text-xs text-[#bbb] line-through">
                ${altPrice.toLocaleString("es-CO")}
              </div>
            </div>
          )}
        </div>

        {/* Variant chips (tone / option / size) */}
        {tieneVariantesTono && !agotado && !p.surtido && (
          <div className="mb-2.5 min-w-0">
            <div className="text-[9px] text-[#9e9e9e] font-medium mb-1">
              {variantLabel}
            </div>
            <div className="flex flex-wrap gap-[3px]">
              {p.variantes
                .filter((v) => v.tono)
                .map((v) => {
                  const agotadaV =
                    !v.disponible || (v.stock !== null && v.stock === 0)
                  const ultimaV = !agotadaV && v.stock === 1
                  const isSel = selTono === v.tono

                  return (
                    <button
                      key={v.tono}
                      disabled={agotadaV}
                      onClick={() =>
                        !agotadaV &&
                        dispatch({
                          type: "SET_TONE",
                          id: p.id,
                          tono: v.tono,
                        })
                      }
                      className={`px-[6px] py-[2px] rounded-[20px] border text-[9px] cursor-pointer transition-all font-sans max-w-full truncate ${
                        agotadaV
                          ? "opacity-40 line-through cursor-not-allowed border-[#e0e0e0] text-[#bbb] bg-[#fafafa]"
                          : ultimaV
                          ? isSel
                            ? "bg-[#ef5350] border-[#ef5350] text-white font-semibold"
                            : "border-[#ef5350] text-[#c62828]"
                          : isSel
                          ? "bg-pink border-pink text-white font-semibold"
                          : "border-[#f0d0dc] bg-white text-[#555] hover:border-pink hover:text-pink"
                      }`}
                    >
                      {v.tono}
                    </button>
                  )
                })}
            </div>
            {stockInfo && (
              <div className="text-[10px] text-[#c62828] font-bold mt-1">
                {stockInfo}
              </div>
            )}
          </div>
        )}

        {/* CTA: services/restaurant → WhatsApp directo; catalog → qty + carrito */}
        {isServiceMode ? (
          <button
            onClick={() => openServiceWhatsApp(p, selTono)}
            className="w-full h-8 mt-auto rounded-[25px] text-[12px] font-semibold font-sans border-none cursor-pointer transition-all bg-wa-green text-white hover:bg-wa-green-dark active:scale-95 flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {ctaLabel}
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-auto">
            {/* Qty control */}
            <div className="flex items-center border-[1.5px] border-[#f0d0dc] rounded-[25px] overflow-hidden flex-shrink-0">
              <button
                disabled={agotado}
                onClick={() => dispatch({ type: "SET_QUANTITY", id: p.id, qty: Math.max(1, qty - 1) })}
                className="w-7 h-7 flex items-center justify-center text-pink text-base border-none bg-transparent cursor-pointer hover:bg-pink-light transition-colors disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[24px] text-center text-[13px] font-semibold text-[#1a1a2e]">
                {qty}
              </span>
              <button
                disabled={agotado}
                onClick={() => dispatch({ type: "SET_QUANTITY", id: p.id, qty: qty + 1 })}
                className="w-7 h-7 flex items-center justify-center text-pink text-base border-none bg-transparent cursor-pointer hover:bg-pink-light transition-colors disabled:opacity-40"
              >
                +
              </button>
            </div>

            {/* Add to cart button */}
            <button
              onClick={() => !btnDisabled && addToCart(p.id)}
              disabled={btnDisabled}
              className={`flex-1 h-8 rounded-[25px] text-[12px] font-semibold font-sans border-none cursor-pointer transition-all
                ${agotado || tonoSelAgotado
                  ? "bg-[#eee] text-[#aaa] cursor-not-allowed"
                  : needTono
                  ? "bg-pink-light text-pink-dark border-[1.5px] border-pink-mid cursor-not-allowed"
                  : inCart
                  ? "bg-pink-dark text-white ring-2 ring-pink-dark ring-offset-1"
                  : "bg-gradient-to-r from-pink to-pink-dark text-white hover:brightness-105 active:scale-95"
                }`}
            >
              {btnLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
