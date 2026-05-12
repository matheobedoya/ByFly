"use client"

import { useStore } from "@/contexts/store"
import { CONFIG } from "@/lib/config"

export function WholesaleBar() {
  const { state, dispatch } = useStore()
  const { cart, priceMode } = state

  const getP = (c: (typeof cart)[0]) =>
    (priceMode === "detal" ? c.detal : c.mayor) ?? c.detal ?? 0
  const total = cart.reduce((s, c) => s + getP(c) * c.qty, 0)
  const pct = Math.min(100, Math.round((total / CONFIG.minimoMayorista) * 100))
  const unlocked = total >= CONFIG.minimoMayorista

  const totalDetal = cart.reduce((s, c) => s + (c.detal ?? 0) * c.qty, 0)
  const totalMayor = cart.reduce(
    (s, c) => s + ((c.mayor ?? c.detal) ?? 0) * c.qty,
    0
  )
  const showAlert =
    priceMode === "detal" && totalDetal >= CONFIG.minimoMayorista
  const alertSaving = totalDetal - totalMayor

  return (
    <>
      {/* Progress bar */}
      <div
        className={`px-[18px] py-[9px] border-b border-[#f0d0dc] flex-shrink-0 transition-colors duration-300 ${
          unlocked ? "bg-gradient-to-r from-[#f1f8e9] to-[#e8f5e9]" : "bg-pink-soft"
        }`}
      >
        <div
          className={`text-xs font-medium mb-1.5 flex justify-between items-center transition-colors duration-200 ${
            unlocked ? "text-[#2e7d32]" : "text-pink-dark"
          }`}
        >
          <span>
            {unlocked
              ? '🎉 ¡Desbloqueaste precio mayorista! Activa "Mayorista"'
              : `Te faltan $${(CONFIG.minimoMayorista - total).toLocaleString("es-CO")} para precio mayorista 🔓`}
          </span>
          <span className="text-[11px] font-semibold">{pct}%</span>
        </div>
        <div className="h-[7px] bg-[#f0d0dc] rounded-[10px] overflow-hidden">
          <div
            className="h-full rounded-[10px] transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: unlocked
                ? "linear-gradient(90deg,#66bb6a,#2e7d32)"
                : "linear-gradient(90deg,#F06292,#C2185B)",
            }}
          />
        </div>
      </div>

      {/* Wholesale switch alert */}
      {showAlert && (
        <div className="mx-[18px] mt-1.5 p-[9px_13px] bg-[#fff8e1] border-[1.5px] border-[#ffe082] rounded-[10px] text-xs text-[#5d4037]">
          🎉{" "}
          <strong>¡Tu pedido supera el mínimo mayorista!</strong> Estás en precio
          detal.{" "}
          {alertSaving > 0 && (
            <span>
              Puedes ahorrar{" "}
              <strong>${alertSaving.toLocaleString("es-CO")}</strong>.
            </span>
          )}
          <button
            onClick={() =>
              dispatch({ type: "SET_PRICE_MODE", mode: "mayor" })
            }
            className="mt-2 w-full py-[9px] bg-pink-dark text-white border-none rounded-[10px] font-sans text-[13px] font-semibold cursor-pointer transition-all hover:bg-pink-deep"
          >
            🔓 Cambiar a precio mayorista
          </button>
        </div>
      )}
    </>
  )
}
