"use client"

import Image from "next/image"
import { useStore } from "@/contexts/store"
import { CONFIG } from "@/lib/config"

export function Header() {
  const { state, dispatch } = useStore()
  const { priceMode, cart, cartOpen } = state
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  return (
    <header
      className="sticky top-0 z-[100] shadow-[0_2px_24px_rgba(136,14,79,0.3)]"
      style={{
        background: "linear-gradient(135deg,#880E4F 0%,#C2185B 45%,#F06292 100%)",
      }}
    >
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative h-[42px] w-[42px] flex-shrink-0">
            <Image
              src={CONFIG.logo}
              alt={CONFIG.brandName}
              fill
              className="object-contain brightness-0 invert"
              onError={() => {}}
              priority
            />
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-white leading-none tracking-wide">
              {CONFIG.brandName}
            </div>
            <div className="text-[10px] tracking-[4px] text-white/80 uppercase font-light">
              {CONFIG.brandSub}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Price toggle */}
          <div
            className="flex rounded-[30px] p-[3px] border border-white/25"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            {(["detal", "mayor"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => dispatch({ type: "SET_PRICE_MODE", mode })}
                className={`px-[15px] py-[6px] rounded-[25px] border-none cursor-pointer font-sans text-xs font-medium transition-all ${
                  priceMode === mode
                    ? "bg-white text-pink-dark font-semibold"
                    : "bg-transparent text-white/75"
                }`}
              >
                {mode === "detal" ? "Detal" : "Mayorista"}
              </button>
            ))}
          </div>

          {/* Cart button */}
          <button
            onClick={() => dispatch({ type: "SET_CART_OPEN", open: !cartOpen })}
            className="flex items-center gap-2 rounded-[30px] px-[18px] py-2 border border-white/35 text-white cursor-pointer text-sm font-medium transition-all hover:bg-white/25"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <span>🛒</span>
            <span>Carrito</span>
            <span
              className={`bg-white text-pink-dark rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold min-w-[20px] transition-transform ${
                cartCount > 0 ? "scale-100" : ""
              }`}
            >
              {cartCount}
            </span>
          </button>

          {/* Admin */}
          <button
            onClick={() => dispatch({ type: "SET_ADMIN_OPEN", open: true })}
            className="text-white/65 border border-white/20 rounded-lg px-[13px] py-2 text-sm cursor-pointer transition-all hover:bg-white/20 hover:text-white"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  )
}
