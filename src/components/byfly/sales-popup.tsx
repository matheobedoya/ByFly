"use client"

import { useEffect, useRef, useState } from "react"
import { useStore } from "@/contexts/store"

const NAMES = [
  "Valentina", "Camila", "Daniela", "Sofía", "Isabella",
  "Mariana", "Alejandra", "Natalia", "Laura", "Sara",
  "Juliana", "Paula", "Gabriela", "Melissa", "Andrea",
  "Tatiana", "Luisa", "Carolina", "Diana", "Viviana",
]

const CITIES = [
  "Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga",
  "Pereira", "Manizales", "Ibagué", "Cartagena", "Pasto",
  "Envigado", "Bello", "Sabaneta", "Itagüí", "Rionegro",
  "Armenia", "Villavicencio", "Santa Marta", "Montería", "Neiva",
]

interface Notif {
  name: string
  city: string
  product: string
  image: string
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function SalesPopup() {
  const { state } = useStore()
  const [notif, setNotif] = useState<Notif | null>(null)
  const [visible, setVisible] = useState(false)
  const productsRef = useRef(state.products)
  const started = useRef(false)

  useEffect(() => {
    productsRef.current = state.products
  }, [state.products])

  useEffect(() => {
    if (!state.products.length || started.current) return
    started.current = true

    const show = () => {
      const prods = productsRef.current
      if (!prods.length) return
      const p = rand(prods)
      setNotif({
        name: rand(NAMES),
        city: rand(CITIES),
        product: p.name.length > 34 ? p.name.slice(0, 34) + "…" : p.name,
        image: p.img1 || "",
      })
      setVisible(true)
      setTimeout(() => setVisible(false), 5000)
    }

    const firstTimer = setTimeout(show, 8000)
    const interval = setInterval(show, 25000)

    return () => {
      clearTimeout(firstTimer)
      clearInterval(interval)
    }
  }, [state.products.length])

  if (!notif) return null

  return (
    <div
      className={`fixed bottom-6 left-4 z-[400] bg-white rounded-2xl shadow-[0_8px_32px_rgba(194,24,91,0.18)] border border-[#f0d0dc] p-3 flex items-center gap-3 w-[calc(100vw-2rem)] max-w-[272px] transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {notif.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={notif.image}
          alt={notif.product}
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-[#f5e0e8]"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-[#fce4ec] flex items-center justify-center flex-shrink-0 text-xl">
          💄
        </div>
      )}

      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[12px] font-semibold text-[#1a1a2e] leading-tight">
          <span className="text-pink-dark">{notif.name}</span>
          <span className="font-normal text-[#777]"> ({notif.city}) compró</span>
        </p>
        <p className="text-[11px] text-[#333] mt-[3px] leading-tight">{notif.product}</p>
        <p className="text-[10px] text-[#2e7d32] font-semibold mt-[4px] flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Verificado
        </p>
      </div>

      <button
        onClick={() => setVisible(false)}
        aria-label="Cerrar"
        className="absolute top-2 right-2.5 text-[#ccc] hover:text-[#999] text-[18px] leading-none transition-colors"
      >
        ×
      </button>
    </div>
  )
}
