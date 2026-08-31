"use client"

import { useMemo, useRef } from "react"
import { useStore } from "@/contexts/store"
import { CONFIG } from "@/lib/config"
import { ProductCard } from "./product-card"

export function NewestSection() {
  const { state } = useStore()
  const { products, currentCat, searchQuery, isLoading } = state
  const scrollRef = useRef<HTMLDivElement>(null)

  const newest = useMemo(
    () =>
      products.filter(
        (p) => p.badge === "Nuevo" && (CONFIG.mostrarImportados || p.cat !== "Importados")
      ),
    [products]
  )

  if (isLoading || currentCat !== "todos" || searchQuery || !newest.length) return null

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -420 : 420, behavior: "smooth" })
  }

  return (
    <div className="max-w-[1280px] mx-auto px-5 pt-8 pb-2">
      {/* Título centrado con líneas rosas */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent to-pink-light rounded-full" />
        <h2 className="font-serif text-[26px] font-bold text-pink-dark italic whitespace-nowrap">
          Lo más nuevo
        </h2>
        <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent to-pink-light rounded-full" />
      </div>

      {/* Carrusel con botones */}
      <div className="relative">
        {/* Flecha izquierda */}
        <button
          onClick={() => scroll("left")}
          aria-label="Anterior"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-white border-[1.5px] border-[#f0d0dc] shadow-md flex items-center justify-center text-pink-dark hover:bg-[#fce4ec] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Carrusel */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {newest.map((p) => (
            <div key={p.id} className="flex-shrink-0 w-[160px] sm:w-[200px] snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Flecha derecha */}
        <button
          onClick={() => scroll("right")}
          aria-label="Siguiente"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-white border-[1.5px] border-[#f0d0dc] shadow-md flex items-center justify-center text-pink-dark hover:bg-[#fce4ec] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
