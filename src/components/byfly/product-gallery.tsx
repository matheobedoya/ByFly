"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type { Product } from "@/types"

interface ProductGalleryProps {
  product: Product
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [idx, setIdx] = useState(0)
  const [failedImgs, setFailedImgs] = useState<Set<number>>(new Set())
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  const imgs = [product.img1, product.img2, product.img3].filter(Boolean)

  const goTo = (i: number) =>
    setIdx(((i % imgs.length) + imgs.length) % imgs.length)

  const goToLb = (i: number) =>
    setLightboxIdx(((i % imgs.length) + imgs.length) % imgs.length)

  const openLightbox = (i: number) => {
    setLightboxIdx(i)
    setLightboxOpen(true)
  }

  const markFailed = (i: number) =>
    setFailedImgs((prev) => new Set([...prev, i]))

  // ESC + arrow keys + body scroll lock
  useEffect(() => {
    if (!lightboxOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false)
      if (e.key === "ArrowRight") setLightboxIdx((p) => ((p + 1) % imgs.length + imgs.length) % imgs.length)
      if (e.key === "ArrowLeft") setLightboxIdx((p) => ((p - 1 + imgs.length) % imgs.length))
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [lightboxOpen, imgs.length])

  if (!imgs.length) {
    return (
      <div className="aspect-square flex items-center justify-center text-5xl bg-gradient-to-br from-pink-light to-[#f8bbd0]">
        💄
      </div>
    )
  }

  return (
    <>
      {/* ── Card gallery ── */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-pink-light to-[#f8bbd0] group">

        {/* Slides — click opens lightbox */}
        <div
          className="flex h-full transition-transform duration-[350ms] ease-out cursor-zoom-in"
          style={{ transform: `translateX(-${idx * 100}%)` }}
          onClick={() => openLightbox(idx)}
        >
          {imgs.map((src, i) => (
            <div key={i} className="min-w-full h-full flex-shrink-0 relative">
              {failedImgs.has(i) ? (
                <div className="w-full h-full flex items-center justify-center text-4xl">💄</div>
              ) : (
                <Image
                  src={src}
                  alt={product.name}
                  fill
                  className="object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 640px) 50vw, 215px"
                  onError={() => markFailed(i)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Zoom hint — visible on hover (desktop) or always on mobile */}
        <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-black/30 flex items-center justify-center pointer-events-none z-10 opacity-70 group-hover:opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-80">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            <line x1="9.5" y1="7" x2="9.5" y2="12" stroke="white" strokeWidth="1.5"/>
            <line x1="7" y1="9.5" x2="12" y2="9.5" stroke="white" strokeWidth="1.5"/>
          </svg>
        </div>

        {/* Arrows (multi-image) */}
        {imgs.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(idx - 1) }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] bg-white/80 hover:bg-white transition-all z-10"
              aria-label="Anterior"
            >‹</button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(idx + 1) }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] bg-white/80 hover:bg-white transition-all z-10"
              aria-label="Siguiente"
            >›</button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[5px] z-10">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); goTo(i) }}
                  className={`h-[6px] rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-[6px] bg-white/50"}`}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/88 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Product name */}
          <div className="absolute top-4 left-4 right-14 text-white/75 text-sm font-medium truncate pointer-events-none">
            {product.name}
          </div>

          {/* Close */}
          <button
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl flex items-center justify-center transition-all z-10 leading-none"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
          >×</button>

          {/* Image */}
          <div
            className="relative flex items-center justify-center"
            style={{ maxWidth: "min(680px, 92vw)", maxHeight: "82vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {failedImgs.has(lightboxIdx) ? (
              <div className="text-7xl">💄</div>
            ) : (
              <Image
                src={imgs[lightboxIdx]}
                alt={product.name}
                width={680}
                height={680}
                className="rounded-2xl object-contain shadow-2xl"
                style={{ maxHeight: "82vh", width: "auto", maxWidth: "92vw" }}
                priority
              />
            )}
          </div>

          {/* Lightbox nav arrows */}
          {imgs.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 hover:bg-white/25 text-white text-2xl flex items-center justify-center transition-all z-10"
                onClick={(e) => { e.stopPropagation(); goToLb(lightboxIdx - 1) }}
                aria-label="Anterior"
              >‹</button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/12 hover:bg-white/25 text-white text-2xl flex items-center justify-center transition-all z-10"
                onClick={(e) => { e.stopPropagation(); goToLb(lightboxIdx + 1) }}
                aria-label="Siguiente"
              >›</button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {imgs.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); goToLb(i) }}
                    className={`h-2 rounded-full transition-all ${i === lightboxIdx ? "w-5 bg-white" : "w-2 bg-white/35"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
