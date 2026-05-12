"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { CONFIG } from "@/lib/config"
import { useStore } from "@/contexts/store"

function ProductCarousel() {
  const { state } = useStore()
  const [idx, setIdx] = useState(0)

  const images = useMemo(() => {
    return state.products
      .filter((p) => p.img1)
      .slice(0, 8)
      .map((p) => ({ src: p.img1, name: p.name }))
  }, [state.products])

  useEffect(() => {
    if (images.length < 2) return
    const timer = setInterval(() => setIdx((i) => (i + 1) % images.length), 3000)
    return () => clearInterval(timer)
  }, [images.length])

  if (!images.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-gradient-to-br from-pink to-pink-dark opacity-25 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[28px] shadow-[0_8px_40px_rgba(136,14,79,0.22)]">
      {images.map((img, i) => (
        <div
          key={`${img.src}-${i}`}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
        >
          <Image
            src={img.src}
            alt={img.name}
            fill
            className="object-cover"
            sizes="460px"
            unoptimized
          />
        </div>
      ))}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300 bg-white cursor-pointer"
            style={{ width: i === idx ? "1.5rem" : "0.375rem", opacity: i === idx ? 1 : 0.5 }}
          />
        ))}
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-pink-light via-[#f8bbd0] to-pink-light border-b border-[#f0d0dc]">
      <div className="max-w-[1280px] mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-[1fr_460px] gap-8 lg:gap-12 items-center">

        {/* Left: text */}
        <div className="flex flex-col gap-4 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <div className="relative h-[52px] w-[110px]">
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
            <div className="text-[10px] tracking-[5px] text-pink uppercase font-light mb-2">
              {CONFIG.brandSub}
            </div>
            <h1 className="font-serif text-[2.1rem] md:text-[2.8rem] xl:text-[3.2rem] font-bold italic text-pink-dark leading-tight">
              {CONFIG.heroTitle.replace("✨ ", "")}
            </h1>
          </div>

          <p className="text-sm text-pink-dark/65 max-w-md mx-auto lg:mx-0 leading-relaxed">
            {CONFIG.heroSubtitle}
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-2">
            {[CONFIG.heroBadge1, CONFIG.heroBadge2, CONFIG.heroBadge3, CONFIG.heroBadge4].map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1 text-[12px] text-pink-dark font-medium bg-white/65 px-3.5 py-1.5 rounded-[25px] border border-pink-dark/15"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Right: auto carousel (desktop only) */}
        <div className="hidden lg:block h-[380px]">
          <ProductCarousel />
        </div>
      </div>
    </section>
  )
}
