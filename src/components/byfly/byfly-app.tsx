"use client"

import Link from "next/link"
import { StoreProvider } from "@/contexts/store"
import { CONFIG } from "@/lib/config"
import { Header } from "./header"
import { FilterBar } from "./filter-bar"
import { HeroSection, BannerCarousel } from "./hero-section"
import { ProductGrid } from "./product-grid"
import { CartDrawer } from "./cart-drawer"
import { AdminPanel } from "./admin-panel"
import { IslandToast } from "./island-toast"
import { SocialFab } from "./social-fab"
import { AboutSection } from "./about-section"
import { AnnouncementBar } from "./announcement-bar"

export function ByflyApp() {
  return (
    <StoreProvider>
      <IslandToast />
      <AnnouncementBar />
      <Header />
      <FilterBar />
      <BannerCarousel />
      <HeroSection />
      {CONFIG.aboutText && <AboutSection />}
      <ProductGrid />
      {CONFIG.siteMode === "catalog" && <CartDrawer />}
      <AdminPanel />
      <SocialFab />

      {/* Footer mínimo con links de subpáginas */}
      <footer className="border-t border-[#f0d0dc] bg-white py-5 px-6 mt-2">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#9e9e9e]">
          <span className="font-serif italic text-pink-dark font-semibold text-sm">
            {CONFIG.brandName} {CONFIG.brandSub}
          </span>
          <div className="flex gap-4 flex-wrap">
            <Link href="/como-hacer-pedido" className="hover:text-pink-dark transition-colors">
              ¿Cómo hacer mi pedido?
            </Link>
            <Link href="/politicas" className="hover:text-pink-dark transition-colors">
              Políticas y envíos
            </Link>
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-dark transition-colors">
              @byflymakeup
            </a>
          </div>
        </div>
      </footer>
    </StoreProvider>
  )
}
