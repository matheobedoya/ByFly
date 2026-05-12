"use client"

import { useState } from "react"
import Image from "next/image"
import type { Product } from "@/types"

interface ProductGalleryProps {
  product: Product
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [idx, setIdx] = useState(0)
  const imgs = [product.img1, product.img2, product.img3].filter(Boolean)

  const goTo = (i: number) => {
    setIdx(((i % imgs.length) + imgs.length) % imgs.length)
  }

  if (!imgs.length) {
    return (
      <div className="aspect-[4/3] flex items-center justify-center text-5xl bg-gradient-to-br from-pink-light to-[#f8bbd0]">
        💄
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-pink-light to-[#f8bbd0]">
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-[350ms] ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {imgs.map((src, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0 relative">
            <Image
              src={src}
              alt={product.name}
              fill
              className="object-contain"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, 215px"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = "none"
              }}
            />
          </div>
        ))}
      </div>

      {/* Arrows (only for multi-image) */}
      {imgs.length > 1 && (
        <>
          <button
            onClick={() => goTo(idx - 1)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] bg-white/80 hover:bg-white transition-all z-10"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={() => goTo(idx + 1)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] bg-white/80 hover:bg-white transition-all z-10"
            aria-label="Siguiente"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[5px] z-10">
            {imgs.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-[6px] rounded-full transition-all ${
                  i === idx
                    ? "w-4 bg-white"
                    : "w-[6px] bg-white/50"
                }`}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
