"use client"

import { useMemo } from "react"
import { useStore } from "@/contexts/store"
import { CAT_ICONS } from "@/lib/config"
import { ProductCard } from "./product-card"
import { DistortedGlass } from "@/components/ui/distorted-glass"

export function ProductGrid() {
  const { state, dispatch } = useStore()
  const { products, isLoading, currentCat, searchQuery } = state

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const mc = currentCat === "todos" || p.cat === currentCat
      const q = searchQuery.toLowerCase()
      const ms =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
      return mc && ms
    })
  }, [products, currentCat, searchQuery])

  const grouped = useMemo(() => {
    if (currentCat !== "todos") {
      return [{ cat: currentCat, items: filtered }]
    }
    const cats = [...new Set(filtered.map((p) => p.cat))]
    return cats.map((cat) => ({
      cat,
      items: filtered.filter((p) => p.cat === cat),
    }))
  }, [filtered, currentCat])

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 py-16 text-center text-[#9e9e9e]">
        <div className="w-9 h-9 border-[3px] border-pink-light border-t-pink rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando catálogo...</p>
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 py-16 text-center text-[#9e9e9e] text-sm leading-relaxed">
        <div className="text-4xl mb-4">😔</div>
        <p>No encontramos productos.</p>
        <button
          onClick={() => {
            dispatch({ type: "SET_SEARCH", query: "" })
            dispatch({ type: "SET_CATEGORY", cat: "todos" })
          }}
          className="mt-5 px-5 py-2 border-[1.5px] border-pink text-pink-dark rounded-[12px] font-sans text-sm cursor-pointer transition-all hover:bg-pink-light"
        >
          Ver todos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-5 pb-10">
      {grouped.map(({ cat, items }, groupIdx) => (
        <div key={cat}>
          {/* Section title */}
          <div className="font-serif text-[28px] font-bold text-pink-dark mt-9 mb-[18px] pb-2.5 border-b-2 border-pink-light flex items-center gap-2.5 italic">
            <span>{CAT_ICONS[cat] || ""}</span>
            {cat}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-2">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Distorted glass separator between sections (not after last) */}
          {groupIdx < grouped.length - 1 && (
            <div className="mt-4">
              <DistortedGlass />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
