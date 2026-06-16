"use client"

import { useMemo } from "react"
import { useStore } from "@/contexts/store"
import { ProductCard } from "./product-card"

export function NewestSection() {
  const { state } = useStore()
  const { products, currentCat, searchQuery, isLoading } = state

  const newest = useMemo(
    () => products.filter((p) => p.badge === "Nuevo"),
    [products]
  )

  if (isLoading || currentCat !== "todos" || searchQuery || !newest.length) return null

  return (
    <div className="max-w-[1280px] mx-auto px-5 pt-7">
      <h2 className="font-serif text-[28px] font-bold text-pink-dark mb-[18px] pb-2.5 border-b-2 border-pink-light flex items-center gap-2.5 italic">
        🆕 Lo más nuevo
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {newest.map((p) => (
          <div key={p.id} className="flex-shrink-0 w-[160px] sm:w-[200px] snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}
