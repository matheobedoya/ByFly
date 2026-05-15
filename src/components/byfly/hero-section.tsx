"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CONFIG } from "@/lib/config"
import { useStore } from "@/contexts/store"

function BannerCarousel() {
  const [idx, setIdx] = useState(0)
  const banners = CONFIG.heroBanners

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  const goTo = (i: number) => setIdx((i + banners.length) % banners.length)

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(136,14,79,0.22)]"
         style={{ height: "clamp(180px, 28vw, 420px)" }}>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {banners[idx].img ? (
            <Image
              src={banners[idx].img}
              alt={banners[idx].title}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority={idx === 0}
              unoptimized
            />
          ) : (
            /* Placeholder de color hasta que la clienta entregue las imágenes */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
                 style={{ background: banners[idx].bg }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-medium mb-1">
                · imagen pendiente ·
              </div>
              <h2 className="font-serif italic text-white text-2xl md:text-3xl lg:text-4xl font-bold leading-tight drop-shadow-md">
                {banners[idx].title}
              </h2>
              <p className="text-white/85 text-sm md:text-base max-w-md leading-relaxed">
                {banners[idx].subtitle}
              </p>
              <button
                className="mt-2 px-6 py-2.5 rounded-full bg-white/20 border border-white/40 text-white text-sm font-semibold backdrop-blur-sm hover:bg-white/30 transition-all cursor-pointer"
              >
                {banners[idx].cta} →
              </button>
            </div>
          )}

          {/* Overlay gradiente inferior para que los dots sean legibles */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Flechas de navegación */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => goTo(idx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 border border-white/30 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/45 transition-all cursor-pointer text-lg"
            aria-label="Banner anterior"
          >
            ‹
          </button>
          <button
            onClick={() => goTo(idx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 border border-white/30 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/45 transition-all cursor-pointer text-lg"
            aria-label="Siguiente banner"
          >
            ›
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all duration-300 bg-white cursor-pointer"
              style={{ width: i === idx ? "1.5rem" : "0.375rem", opacity: i === idx ? 1 : 0.5 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HeroSection() {
  const { state, dispatch } = useStore()

  return (
    <section className="bg-gradient-to-br from-pink-light via-[#f8bbd0] to-pink-light border-b border-[#f0d0dc]">
      <div className="max-w-[1280px] mx-auto px-5 pt-7 pb-5 lg:pt-10 lg:pb-7">

        {/* Texto + buscador */}
        <div className="flex flex-col gap-3 text-center lg:text-left mb-5 lg:mb-7 max-w-2xl mx-auto lg:mx-0">
          <div className="flex justify-center lg:justify-start">
            <div className="relative h-[44px] w-[94px]">
              <Image
                src={CONFIG.logo}
                alt={CONFIG.brandName}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-[5px] text-pink uppercase font-light mb-1">
              {CONFIG.brandSub}
            </div>
            <h1 className="font-serif text-[1.9rem] md:text-[2.6rem] xl:text-[3rem] font-bold italic text-pink-dark leading-tight">
              {CONFIG.heroTitle.replace("✨ ", "")}
            </h1>
          </div>

          <p className="text-sm text-pink-dark/65 leading-relaxed">
            {CONFIG.heroSubtitle}
          </p>

          {/* Buscador (movido desde FilterBar) */}
          <div className="relative max-w-md mx-auto lg:mx-0 w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={state.searchQuery}
              onChange={(e) => dispatch({ type: "SET_SEARCH", query: e.target.value })}
              placeholder="Buscar producto, marca..."
              className="w-full pl-10 pr-4 py-2.5 border-[1.5px] border-pink-dark/20 rounded-[30px] font-sans text-sm outline-none bg-white/70 text-[#1a1a2e] transition-all focus:border-pink focus:bg-white focus:shadow-[0_0_0_3px_rgba(240,98,146,0.12)] placeholder:text-pink-dark/40"
            />
          </div>
        </div>

        {/* Banner carousel grande */}
        <BannerCarousel />
      </div>
    </section>
  )
}
