"use client"

import Image from "next/image"
import { useStore } from "@/contexts/store"
import { CATEGORIES, CAT_ICONS } from "@/lib/config"

function isImageUrl(val: string): boolean {
  return val.startsWith("/") || val.startsWith("http")
}

export function FilterBar() {
  const { state, dispatch } = useStore()
  const { currentCat } = state

  return (
    <div className="bg-white border-b border-[#f0d0dc] px-5 py-2.5 sticky top-[68px] z-[90] shadow-[0_2px_12px_rgba(240,98,146,0.07)]">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex gap-1.5 flex-wrap items-center">
          {CATEGORIES.map(({ key, label, name }) => {
            const isActive = currentCat === key
            // Para badge filters el icono viene del nombre del badge
            const iconKey = key.startsWith("badge:") ? key.slice(6) : key
            const iconVal = CAT_ICONS[iconKey] || ""
            const showImg = iconVal && isImageUrl(iconVal)

            return (
              <button
                key={key}
                onClick={() => dispatch({ type: "SET_CATEGORY", cat: key })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[25px] border-[1.5px] text-xs font-medium cursor-pointer transition-all whitespace-nowrap font-sans ${
                  isActive
                    ? "bg-pink border-pink text-white"
                    : "bg-white border-[#f0d0dc] text-[#9e9e9e] hover:border-pink hover:text-pink"
                }`}
              >
                {showImg ? (
                  <Image
                    src={iconVal}
                    alt={name}
                    width={16}
                    height={16}
                    className="rounded-sm object-cover flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  iconVal && <span className="text-sm leading-none">{iconVal}</span>
                )}
                <span>{name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
