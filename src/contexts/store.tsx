"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react"
import { parseCsv, getVariante, isProductAgotado } from "@/lib/csv-parser"
import { CONFIG } from "@/lib/config"
import type { CartItem, Discount, PriceMode, Product, StoreState, ToastMessage } from "@/types"

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_PRODUCTS"; products: Product[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_PRICE_MODE"; mode: PriceMode }
  | { type: "SET_CATEGORY"; cat: string }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_QUANTITY"; id: number; qty: number }
  | { type: "SET_TONE"; id: number; tono: string }
  | { type: "ADD_TO_CART"; item: CartItem }
  | { type: "UPDATE_CART_QTY"; cartKey: string; delta: number }
  | { type: "REMOVE_FROM_CART"; cartKey: string }
  | { type: "SET_CART"; cart: CartItem[] }
  | { type: "SET_CART_OPEN"; open: boolean }
  | { type: "SET_ADMIN_OPEN"; open: boolean }
  | { type: "SHOW_TOAST"; toast: ToastMessage }
  | { type: "CLEAR_TOAST" }
  | { type: "ADD_LOCAL_PRODUCT"; product: Product }
  | { type: "UPDATE_LOCAL_PRODUCT"; id: number; updates: Partial<Product> }
  | { type: "DELETE_LOCAL_PRODUCTS"; ids: number[] }
  | { type: "REPLACE_PRODUCTS"; products: Product[] }
  | { type: "SET_DISCOUNTS"; discounts: Discount[] }
  | { type: "SET_DISCOUNT_INPUT"; code: string }
  | { type: "APPLY_DISCOUNT"; discount: Discount }
  | { type: "REMOVE_DISCOUNT" }

// ── Reducer ──────────────────────────────────────────────────────────────────

const initialState: StoreState = {
  products: [],
  isLoading: true,
  cart: [],
  priceMode: "detal",
  currentCat: "todos",
  searchQuery: "",
  quantities: {},
  selectedTones: {},
  cartOpen: false,
  adminOpen: false,
  toast: null,
  discounts: [],
  discountInput: "",
  appliedDiscount: null,
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "SET_PRODUCTS":
      return { ...state, products: action.products, isLoading: false }
    case "SET_LOADING":
      return { ...state, isLoading: action.loading }
    case "SET_PRICE_MODE":
      return { ...state, priceMode: action.mode }
    case "SET_CATEGORY":
      return { ...state, currentCat: action.cat }
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query }
    case "SET_QUANTITY":
      return { ...state, quantities: { ...state.quantities, [action.id]: action.qty } }
    case "SET_TONE":
      return { ...state, selectedTones: { ...state.selectedTones, [action.id]: action.tono } }
    case "ADD_TO_CART": {
      const exist = state.cart.find((c) => c.cartKey === action.item.cartKey)
      if (exist) {
        return {
          ...state,
          cart: state.cart.map((c) =>
            c.cartKey === action.item.cartKey
              ? { ...c, qty: c.qty + action.item.qty }
              : c
          ),
        }
      }
      return { ...state, cart: [...state.cart, action.item] }
    }
    case "UPDATE_CART_QTY":
      return {
        ...state,
        cart: state.cart.map((c) =>
          c.cartKey === action.cartKey
            ? { ...c, qty: Math.max(1, c.qty + action.delta) }
            : c
        ),
      }
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((c) => c.cartKey !== action.cartKey) }
    case "SET_CART":
      return { ...state, cart: action.cart }
    case "SET_CART_OPEN":
      return { ...state, cartOpen: action.open }
    case "SET_ADMIN_OPEN":
      return { ...state, adminOpen: action.open }
    case "SHOW_TOAST":
      return { ...state, toast: action.toast }
    case "CLEAR_TOAST":
      return { ...state, toast: null }
    case "ADD_LOCAL_PRODUCT":
      return { ...state, products: [...state.products, action.product] }
    case "UPDATE_LOCAL_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p
        ),
      }
    case "DELETE_LOCAL_PRODUCTS":
      return {
        ...state,
        products: state.products.filter((p) => !action.ids.includes(p.id)),
        cart: state.cart.filter((c) => !action.ids.includes(c.id)),
      }
    case "REPLACE_PRODUCTS":
      return { ...state, products: action.products, cart: [] }
    case "SET_DISCOUNTS":
      return { ...state, discounts: action.discounts }
    case "SET_DISCOUNT_INPUT":
      return { ...state, discountInput: action.code }
    case "APPLY_DISCOUNT":
      return { ...state, appliedDiscount: action.discount, discountInput: action.discount.code }
    case "REMOVE_DISCOUNT":
      return { ...state, appliedDiscount: null, discountInput: "" }
    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: StoreState
  dispatch: React.Dispatch<Action>
  showToast: (text: string) => void
  addToCart: (productId: number) => void
  reloadSheets: () => Promise<void>
  applyDiscount: (code: string, cartTotal: number) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

let toastId = 0

function parseDiscountsCsv(csv: string): Discount[] {
  const lines = csv.trim().split("\n").slice(1) // skip header row
  const result: Discount[] = []
  for (const line of lines) {
    const [code, tipo, valor, minPedido, activo] = line.split(",").map((v) => v.trim())
    if (!code) continue
    result.push({
      code: code.toUpperCase(),
      tipo: tipo === "fijo" ? "fijo" : "porcentaje",
      valor: parseFloat(valor) || 0,
      minPedido: parseFloat(minPedido) || 0,
      activo: activo?.toLowerCase() === "si",
    })
  }
  return result
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const showToast = useCallback((text: string) => {
    const id = ++toastId
    dispatch({ type: "SHOW_TOAST", toast: { id, text } })
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000)
  }, [])

  const persistCart = useCallback((cart: CartItem[]) => {
    try {
      localStorage.setItem("byfly_cart", JSON.stringify(cart))
    } catch {}
  }, [])

  const persistProducts = useCallback((products: Product[]) => {
    try {
      localStorage.setItem("byfly_products", JSON.stringify(products))
      localStorage.setItem("byfly_products_ts", Date.now().toString())
    } catch {}
  }, [])

  const loadProducts = useCallback(async () => {
    const CK = "byfly_products"
    const TK = "byfly_products_ts"
    try {
      const local = localStorage.getItem(CK)
      const ts = parseInt(localStorage.getItem(TK) || "0")
      const stale = Date.now() - ts > CONFIG.cacheTtlMs
      if (local && !stale) {
        dispatch({ type: "SET_PRODUCTS", products: JSON.parse(local) })
        return
      }
      const res = await fetch(CONFIG.sheetsUrl + "&t=" + Date.now())
      if (!res.ok) throw new Error("HTTP " + res.status)
      const products = parseCsv(await res.text())
      persistProducts(products)
      dispatch({ type: "SET_PRODUCTS", products })
    } catch {
      try {
        const local = localStorage.getItem(CK)
        if (local) {
          dispatch({ type: "SET_PRODUCTS", products: JSON.parse(local) })
          showToast("⚠️ Cargado desde caché")
        } else {
          dispatch({ type: "SET_LOADING", loading: false })
        }
      } catch {
        dispatch({ type: "SET_LOADING", loading: false })
      }
    }
  }, [persistProducts, showToast])

  const loadDiscounts = useCallback(async () => {
    if (!CONFIG.discountsUrl) return
    try {
      const res = await fetch(CONFIG.discountsUrl + "&t=" + Date.now())
      if (!res.ok) return
      const discounts = parseDiscountsCsv(await res.text())
      dispatch({ type: "SET_DISCOUNTS", discounts })
    } catch {}
  }, [])

  const reloadSheets = useCallback(async () => {
    try {
      localStorage.removeItem("byfly_products")
      localStorage.removeItem("byfly_products_ts")
    } catch {}
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_CART", cart: [] })
    showToast("🔄 Recargando desde Google Sheets...")
    await loadProducts()
  }, [loadProducts, showToast])

  const applyDiscount = useCallback(
    (code: string, cartTotal: number) => {
      const found = state.discounts.find(
        (d) => d.code === code.trim().toUpperCase() && d.activo
      )
      if (!found) {
        showToast("❌ Código de descuento inválido")
        return
      }
      if (cartTotal < found.minPedido) {
        showToast(`⚠️ Mínimo $${found.minPedido.toLocaleString("es-CO")} para este código`)
        return
      }
      dispatch({ type: "APPLY_DISCOUNT", discount: found })
      const label =
        found.tipo === "porcentaje"
          ? `${found.valor}% off`
          : `$${found.valor.toLocaleString("es-CO")} off`
      showToast(`✅ Descuento ${label} aplicado`)
    },
    [state.discounts, showToast]
  )

  const addToCart = useCallback(
    (productId: number) => {
      const p = state.products.find((x) => x.id === productId)
      if (!p) return

      const variantesConTono = p.variantes.filter((v) => v.tono)
      const tieneVariantesTono = variantesConTono.length > 0
      const tono = state.selectedTones[productId] || ""

      if (tieneVariantesTono && !tono && !p.surtido) {
        showToast("👆 Elige un tono primero")
        return
      }

      const variante = getVariante(p, tono)
      if (!variante) {
        showToast("⚠️ Variante no encontrada")
        return
      }
      if (!variante.disponible || (variante.stock !== null && variante.stock === 0)) {
        showToast("❌ Este tono está agotado")
        return
      }

      const qty = state.quantities[productId] || 1
      const cartKey = `${productId}__${tono}`
      const exist = state.cart.find((c) => c.cartKey === cartKey)

      if (variante.stock !== null) {
        const enCarrito = exist ? exist.qty : 0
        if (enCarrito + qty > variante.stock) {
          showToast(`⚠️ Solo hay ${variante.stock} unidad${variante.stock === 1 ? "" : "es"} de este tono`)
          return
        }
      }

      const item: CartItem = {
        id: productId,
        cartKey,
        qty,
        tono,
        name: p.name,
        brand: p.brand,
        detal: p.detal,
        mayor: p.mayor,
        img: p.img1,
        stock: variante.stock,
      }
      dispatch({ type: "ADD_TO_CART", item })
      showToast(`✅ ${p.name}${tono ? " — " + tono : ""} agregado`)
    },
    [state.products, state.selectedTones, state.quantities, state.cart, showToast]
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem("byfly_cart")
      if (saved) dispatch({ type: "SET_CART", cart: JSON.parse(saved) })
    } catch {}
    loadProducts()
    loadDiscounts()
  }, [loadProducts, loadDiscounts])

  useEffect(() => {
    if (!state.isLoading) persistCart(state.cart)
  }, [state.cart, state.isLoading, persistCart])

  useEffect(() => {
    if (!state.isLoading && state.products.length > 0) {
      try {
        localStorage.setItem("byfly_products", JSON.stringify(state.products))
      } catch {}
    }
  }, [state.products, state.isLoading])

  return (
    <StoreContext.Provider value={{ state, dispatch, showToast, addToCart, reloadSheets, applyDiscount }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export { isProductAgotado, getVariante }
