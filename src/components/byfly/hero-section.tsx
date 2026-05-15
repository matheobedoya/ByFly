"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CONFIG } from "@/lib/config"
import { useStore } from "@/contexts/store"

export function BannerCarousel() {
  const [idx, setIdx] = useState(0)
  const banners = CONFIG.heroBanners

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 8000)
    return () => clearInterval(t)
  }, [banners.length])

  const goTo = (i: number) => setIdx((i + banners.length) % banners.length)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(200px, 32vw, 480px)" }}
    >
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
              sizes="100vw"
              priority={idx === 0}
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ background: banners[idx].bg }}
            >
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-medium mb-1">
                · imagen pendiente ·
              </div>
              <h2 className="font-serif italic text-white text-2xl md:text-3xl lg:text-4xl font-bold leading-tight drop-shadow-md">
                {banners[idx].title}
              </h2>
              <p className="text-white/85 text-sm md:text-base max-w-md leading-relaxed">
                {banners[idx].subtitle}
              </p>
              <button className="mt-2 px-6 py-2.5 rounded-full bg-white/20 border border-white/40 text-white text-sm font-semibold backdrop-blur-sm hover:bg-white/30 transition-all cursor-pointer">
                {banners[idx].cta} →
              </button>
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => goTo(idx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 border border-white/30 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/45 transition-all cursor-pointer text-lg"
            aria-label="Banner anterior"
          >‹</button>
          <button
            onClick={() => goTo(idx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 border border-white/30 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/45 transition-all cursor-pointer text-lg"
            aria-label="Siguiente banner"
          >›</button>
        </>
      )}

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
  const { priceMode, searchQuery } = state

  return (
    <section
      className="border-b border-[#f0d0dc]"
      style={{ background: "linear-gradient(160deg,#fce4ec 0%,#f8bbd0 50%,#fce4ec 100%)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 py-5 lg:py-7">
        {/* Título */}
        <div className="mb-4">
          <div className="text-[10px] tracking-[5px] text-pink uppercase font-light mb-1">
            {CONFIG.brandSub}
          </div>
          <h1 className="font-serif text-[1.6rem] md:text-[2rem] xl:text-[2.4rem] font-bold italic text-pink-dark leading-tight mb-1.5">
            {CONFIG.heroTitle.replace("✨ ", "")}
          </h1>
          <p className="text-sm text-pink-dark/60 leading-relaxed max-w-xl">
            {CONFIG.heroSubtitle}
          </p>
        </div>

        {/* Buscador + toggle Detal/Mayorista en la misma fila */}
        {CONFIG.siteMode === "catalog" && (
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-lg">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => dispatch({ type: "SET_SEARCH", query: e.target.value })}
                placeholder="Buscar producto, marca..."
                className="w-full pl-10 pr-4 py-2.5 border-[1.5px] border-pink-dark/20 rounded-[30px] font-sans text-sm outline-none bg-white/70 text-[#1a1a2e] transition-all focus:border-pink focus:bg-white focus:shadow-[0_0_0_3px_rgba(240,98,146,0.12)] placeholder:text-pink-dark/40"
              />
            </div>

            <div
              className="flex rounded-[30px] p-[3px] border border-pink/25 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              {(["detal", "mayor"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => dispatch({ type: "SET_PRICE_MODE", mode })}
                  className={`px-4 py-[6px] rounded-[25px] text-xs font-medium cursor-pointer transition-all ${
                    priceMode === mode
                      ? "bg-pink text-white font-semibold shadow-sm"
                      : "bg-transparent text-pink-dark/70 hover:text-pink-dark"
                  }`}
                >
                  {mode === "detal" ? "Detal" : "Mayorista"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
