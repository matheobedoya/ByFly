"use client"

import { useStore } from "@/contexts/store"
import { CATEGORIES } from "@/lib/config"

export function FilterBar() {
  const { state, dispatch } = useStore()
  const { currentCat, searchQuery } = state

  return (
    <div
      className="bg-white border-b border-[#f0d0dc] px-6 py-3 sticky top-[68px] z-[90] shadow-[0_2px_12px_rgba(240,98,146,0.07)]"
    >
      <div className="max-w-[1280px] mx-auto flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => dispatch({ type: "SET_SEARCH", query: e.target.value })}
            placeholder="Buscar producto, marca..."
            className="w-full pl-9 pr-4 py-2 border-[1.5px] border-[#f0d0dc] rounded-[30px] font-sans text-sm outline-none bg-pink-soft text-[#1a1a2e] transition-all focus:border-pink focus:bg-white focus:shadow-[0_0_0_3px_rgba(240,98,146,0.08)]"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => dispatch({ type: "SET_CATEGORY", cat: key })}
              className={`px-3.5 py-1.5 rounded-[25px] border-[1.5px] text-xs font-medium cursor-pointer transition-all whitespace-nowrap font-sans ${
                currentCat === key
                  ? "bg-pink border-pink text-white"
                  : "bg-white border-[#f0d0dc] text-[#9e9e9e] hover:border-pink hover:text-pink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
