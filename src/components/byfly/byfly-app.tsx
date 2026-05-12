"use client"

import { StoreProvider } from "@/contexts/store"
import { Header } from "./header"
import { FilterBar } from "./filter-bar"
import { HeroSection } from "./hero-section"
import { ProductGrid } from "./product-grid"
import { CartDrawer } from "./cart-drawer"
import { AdminPanel } from "./admin-panel"
import { IslandToast } from "./island-toast"
import { SocialFab } from "./social-fab"

export function ByflyApp() {
  return (
    <StoreProvider>
      <IslandToast />
      <Header />
      <FilterBar />
      <HeroSection />
      <ProductGrid />
      <CartDrawer />
      <AdminPanel />
      <SocialFab />
    </StoreProvider>
  )
}
