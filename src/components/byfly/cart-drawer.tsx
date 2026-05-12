"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { useStore } from "@/contexts/store"
import { CONFIG } from "@/lib/config"
import { WholesaleBar } from "./wholesale-bar"

export function CartDrawer() {
  const { state, dispatch, showToast } = useStore()
  const { cart, cartOpen, priceMode } = state
  const [clientName, setClientName] = useState("")
  const [clientCity, setClientCity] = useState("")

  const getP = (c: (typeof cart)[0]) =>
    (priceMode === "detal" ? c.detal : c.mayor) ?? c.detal ?? 0
  const total = cart.reduce((s, c) => s + getP(c) * c.qty, 0)
  const totalDetal = cart.reduce((s, c) => s + (c.detal ?? 0) * c.qty, 0)
  const totalMayor = cart.reduce((s, c) => s + ((c.mayor ?? c.detal) ?? 0) * c.qty, 0)
  const saving = priceMode === "mayor" ? totalDetal - totalMayor : 0
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const mayorWarning =
    priceMode === "mayor" &&
    cart.length > 0 &&
    total < CONFIG.minimoMayorista

  const sendToWhatsApp = () => {
    if (!cart.length) { showToast("⚠️ El carrito está vacío"); return }
    if (mayorWarning) return
    const mode = priceMode === "detal" ? "Detal" : "Mayorista"
    let msg = `🌸 *Pedido BYFLY Makeup*\n`
    if (clientName) msg += `👤 *Nombre:* ${clientName}\n`
    if (clientCity) msg += `📍 *Ciudad:* ${clientCity}\n`
    msg += `💰 *Precio:* ${mode}\n\n`
    cart.forEach((c) => {
      const p = getP(c)
      msg += `- ${c.qty}x ${c.name}${c.brand ? ` (${c.brand})` : ""}${c.tono ? ` — Tono: *${c.tono}*` : ""} — $${(p * c.qty).toLocaleString("es-CO")}\n`
    })
    msg += `\n💰 *Total: $${total.toLocaleString("es-CO")}*`
    if (saving > 0) msg += `\n🟢 *Ahorro vs detal: $${saving.toLocaleString("es-CO")}*`
    if (priceMode === "mayor") msg += `\n\n⚠️ _Pedido mayorista — mínimo $${CONFIG.minimoMayorista.toLocaleString("es-CO")}_`
    msg += `\n\n¡Hola! Me gustaría realizar este pedido 😊`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "SET_CART_OPEN", open: false })}
            className="fixed inset-0 bg-[rgba(26,26,46,0.5)] z-[200] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            key="cart-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            className="fixed right-0 top-0 h-dvh w-[min(480px,100vw)] bg-white z-[201] flex flex-col shadow-[-8px_0_48px_rgba(136,14,79,0.18)]"
          >
            {/* Header */}
            <div
              className="px-[22px] py-[18px] flex items-center justify-between flex-shrink-0"
              style={{
                background: "linear-gradient(135deg,#880E4F,#C2185B)",
              }}
            >
              <h2 className="font-serif text-[22px] font-bold text-white">
                🛒 Mi Carrito
              </h2>
              <button
                onClick={() => dispatch({ type: "SET_CART_OPEN", open: false })}
                className="bg-white/15 border-none text-white w-8 h-8 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-white/30 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Wholesale bar */}
            <WholesaleBar />

            {/* Shipping note */}
            {cart.length > 0 && (
              <div className="mx-[18px] mt-1.5 px-3 py-[7px] bg-[#e8f4fd] border border-[#b3d9f5] rounded-[10px] text-[11px] text-[#1565c0] leading-relaxed flex-shrink-0">
                🚚 <strong>Envíos a toda Colombia</strong> — Usualmente desde{" "}
                <strong>$8.000</strong> con Interrapidísimo.
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3.5">
              {!cart.length ? (
                <div className="text-center py-[52px] text-[#9e9e9e]">
                  <div className="text-5xl mb-2">🛒</div>
                  <p className="text-sm leading-relaxed">
                    Tu carrito está vacío.
                    <br />
                    ¡Explora el catálogo!
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const p = getP(item)
                  return (
                    <div
                      key={item.cartKey}
                      className="flex gap-3 py-[13px] border-b border-pink-light items-start"
                    >
                      <div className="w-[52px] h-[52px] rounded-[10px] flex-shrink-0 overflow-hidden bg-pink-light relative">
                        {item.img ? (
                          <Image src={item.img} alt={item.name} fill className="object-cover" sizes="52px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[22px]">💄</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.brand && (
                          <div className="text-[10px] text-pink font-semibold uppercase tracking-[1px]">
                            {item.brand}
                          </div>
                        )}
                        <div className="text-[13px] font-medium text-[#1a1a2e] leading-[1.3]">{item.name}</div>
                        {item.tono && (
                          <div className="text-[11px] text-pink-dark font-medium mt-[2px]">
                            Tono: {item.tono}
                          </div>
                        )}
                        <div className="text-[13px] text-pink-dark font-semibold mt-[2px]">
                          ${(p * item.qty).toLocaleString("es-CO")}
                        </div>
                        {/* Qty controls */}
                        <div className="flex items-center gap-[7px] mt-1.5">
                          <button
                            onClick={() => {
                              if (item.qty <= 1) {
                                dispatch({ type: "REMOVE_FROM_CART", cartKey: item.cartKey })
                              } else {
                                dispatch({ type: "UPDATE_CART_QTY", cartKey: item.cartKey, delta: -1 })
                              }
                            }}
                            className="w-6 h-6 border border-[#f0d0dc] rounded-full bg-white text-pink cursor-pointer text-sm flex items-center justify-center hover:bg-pink hover:text-white transition-all"
                          >
                            −
                          </button>
                          <span className="text-xs font-semibold min-w-[18px] text-center">{item.qty}</span>
                          <button
                            onClick={() => {
                              if (item.stock !== null && item.qty >= item.stock) {
                                showToast(`⚠️ Solo hay ${item.stock} unidades`)
                                return
                              }
                              dispatch({ type: "UPDATE_CART_QTY", cartKey: item.cartKey, delta: 1 })
                            }}
                            className="w-6 h-6 border border-[#f0d0dc] rounded-full bg-white text-pink cursor-pointer text-sm flex items-center justify-center hover:bg-pink hover:text-white transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => dispatch({ type: "REMOVE_FROM_CART", cartKey: item.cartKey })}
                        className="text-[#f0d0dc] cursor-pointer text-lg p-1 transition-all hover:text-pink-dark flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div className="px-[18px] pt-2 pb-1 bg-pink-soft border-t border-[#f0d0dc] flex-shrink-0">
                <div className="flex justify-between text-[13px] text-[#555] mb-1">
                  <span>Subtotal</span>
                  <span>${total.toLocaleString("es-CO")}</span>
                </div>
                {saving > 0 && (
                  <div className="text-[12px] text-[#2e7d32] font-semibold text-right mb-1">
                    🟢 Ahorraste ${saving.toLocaleString("es-CO")} vs precio detal
                  </div>
                )}
                <div className="flex justify-between text-[15px] font-semibold text-pink-dark pt-1.5 mt-1.5 border-t border-dashed border-[#f0d0dc]">
                  <span>Total</span>
                  <span>${total.toLocaleString("es-CO")}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-[18px] pt-2.5 pb-3.5 border-t border-[#f0d0dc] bg-white flex-shrink-0">
              <div className="text-[11px] text-[#9e9e9e] mb-1.5">
                Precios {priceMode === "detal" ? "al Detal" : "Mayorista"}
              </div>
              <div className="mb-[7px]">
                <label className="text-[10px] font-semibold text-pink-dark uppercase tracking-[0.5px] block mb-[3px]">
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: María García"
                  maxLength={60}
                  className="w-full px-[13px] py-2 border-[1.5px] border-[#f0d0dc] rounded-[10px] font-sans text-[13px] text-[#1a1a2e] outline-none transition-all focus:border-pink focus:shadow-[0_0_0_3px_rgba(240,98,146,0.08)]"
                />
              </div>
              <div className="mb-2.5">
                <label className="text-[10px] font-semibold text-pink-dark uppercase tracking-[0.5px] block mb-[3px]">
                  Tu ciudad
                </label>
                <input
                  type="text"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  placeholder="Ej: Medellín"
                  maxLength={60}
                  className="w-full px-[13px] py-2 border-[1.5px] border-[#f0d0dc] rounded-[10px] font-sans text-[13px] text-[#1a1a2e] outline-none transition-all focus:border-pink focus:shadow-[0_0_0_3px_rgba(240,98,146,0.08)]"
                />
              </div>
              {mayorWarning && (
                <div className="px-[14px] py-2.5 bg-[#fff3e0] border-[1.5px] border-[#ffb74d] rounded-[12px] text-[13px] text-[#e65100] mb-2.5 text-center font-medium">
                  ⚠️ Te faltan ${(CONFIG.minimoMayorista - total).toLocaleString("es-CO")} para el mínimo mayorista
                </div>
              )}
              <button
                onClick={sendToWhatsApp}
                disabled={!cart.length || mayorWarning}
                className="w-full py-3.5 bg-wa-green text-white border-none rounded-[14px] font-sans text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2.5 transition-all hover:bg-wa-green-dark hover:scale-[1.01] disabled:bg-[#bbb] disabled:cursor-not-allowed disabled:scale-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar pedido por WhatsApp
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
