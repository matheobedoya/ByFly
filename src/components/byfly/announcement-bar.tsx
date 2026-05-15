"use client"

import { CONFIG } from "@/lib/config"

export function AnnouncementBar() {
  const items = [CONFIG.heroBadge1, CONFIG.heroBadge2, CONFIG.heroBadge3, CONFIG.heroBadge4]
  const text = items.join("   ·   ")

  return (
    <div
      className="overflow-hidden py-1.5 text-[11px] font-medium tracking-wide"
      style={{ background: "#5c0a35", color: "#fce4ec" }}
    >
      {/* Two identical copies — translateX(-50%) crea el loop perfecto */}
      <div className="flex whitespace-nowrap animate-ticker">
        <span className="flex-shrink-0 pr-16">{text}</span>
        <span className="flex-shrink-0 pr-16">{text}</span>
      </div>
    </div>
  )
}
