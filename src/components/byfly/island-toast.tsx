"use client"

import { useEffect, useRef } from "react"
import {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  DynamicTitle,
  DynamicDescription,
  SIZE_PRESETS,
  useDynamicIslandSize,
} from "@/components/ui/dynamic-island"
import { useStore } from "@/contexts/store"

function ToastContent() {
  const { state } = useStore()
  const { setSize, dispatch } = useDynamicIslandSize()
  const prevToastId = useRef<number | null>(null)

  useEffect(() => {
    if (!state.toast || state.toast.id === prevToastId.current) return
    prevToastId.current = state.toast.id

    // Dispatch directo para saltarse el guard de setSize (que bloquea EMPTY→COMPACT
    // cuando previousSize ya era COMPACT, causando el cuadrado negro colgado)
    dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.COMPACT })
    const timer = setTimeout(() => {
      dispatch({ type: "SET_SIZE", newSize: SIZE_PRESETS.EMPTY })
    }, 2600)
    return () => clearTimeout(timer)
  }, [state.toast, dispatch])

  if (!state.toast) return null

  return (
    <DynamicContainer className="flex items-center justify-center h-full w-full px-4">
      <DynamicTitle className="text-white text-xs font-medium text-center truncate">
        {state.toast.text}
      </DynamicTitle>
    </DynamicContainer>
  )
}

export function IslandToast() {
  return (
    <div className="fixed top-[82px] left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
      <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
        <div className="flex items-center justify-center">
          <DynamicIsland id="byfly-toast">
            <ToastContent />
          </DynamicIsland>
        </div>
      </DynamicIslandProvider>
    </div>
  )
}
