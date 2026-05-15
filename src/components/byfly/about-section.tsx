"use client"

import { CONFIG } from "@/lib/config"

export function AboutSection() {
  const title = CONFIG.aboutTitle as string
  const text = CONFIG.aboutText as string
  if (!text) return null

  return (
    <section className="bg-white border-b border-[#f0d0dc]">
      <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
        <h2 className="font-serif text-[2rem] md:text-[2.4rem] font-bold italic text-pink-dark mb-4 text-center lg:text-left">
          {title || "¿Quiénes somos?"}
        </h2>
        <div className="max-w-2xl text-sm leading-relaxed text-[#444] space-y-3 mx-auto lg:mx-0">
          {text.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}
