"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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
  const [mounted, setMounted] = useState(false)
  const justOpened = useRef(false)

  const imgs = [product.img1, product.img2, product.img3].filter(Boolean)

  useEffect(() => { setMounted(true) }, [])

  const goTo = (i: number) =>
    setIdx(((i % imgs.length) + imgs.length) % imgs.length)

  const goToLb = (i: number) =>
    setLightboxIdx(((i % imgs.length) + imgs.length) % imgs.length)

  const openLightbox = (i: number) => {
    justOpened.current = true
    setLightboxIdx(i)
    setLightboxOpen(true)
    setTimeout(() => { justOpened.current = false }, 150)
  }

  const closeLightbox = () => {
    if (justOpened.current) return
    setLightboxOpen(false)
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
      if (e.key === "ArrowLeft") setLightboxIdx((p) => (p - 1 + imgs.length) % imgs.length)
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

  const lightbox = lightboxOpen && (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/88 p-4"
      onClick={closeLightbox}
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

      {/* Image — contenedor con dimensiones fijas + fill + object-contain */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: "min(680px, 90vw)",
          height: "min(680px, 82vh)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {failedImgs.has(lightboxIdx) ? (
          <div className="w-full h-full flex items-center justify-center text-7xl">💄</div>
        ) : (
          <Image
            src={imgs[lightboxIdx]}
            alt={product.name}
            fill
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Lightbox nav */}
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
  )

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

        {/* Zoom hint */}
        <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-black/30 flex items-center justify-center pointer-events-none z-10 opacity-60 sm:opacity-0 sm:group-hover:opacity-70 transition-opacity">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="6"/>
            <line x1="16" y1="16" x2="21" y2="21"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
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

      {/* Portal — renderiza fuera del árbol para evitar el transform del padre */}
      {mounted && createPortal(lightbox, document.body)}
    </>
  )
}
