export interface Variant {
  tono: string
  stock: number | null
  disponible: boolean
}

export interface Product {
  id: number
  name: string
  brand: string
  cat: string
  detal: number | null
  mayor: number | null
  img1: string
  img2: string
  img3: string
  surtido: boolean
  badge: string
  variantes: Variant[]
}

export interface CartItem {
  id: number
  cartKey: string
  qty: number
  tono: string
  name: string
  brand: string
  detal: number | null
  mayor: number | null
  img: string
  stock: number | null
}

export type PriceMode = "detal" | "mayor"

export interface ToastMessage {
  id: number
  text: string
}

export interface Discount {
  code: string
  tipo: "porcentaje" | "fijo"
  valor: number
  minPedido: number
  activo: boolean
}

export interface StoreState {
  products: Product[]
  isLoading: boolean
  cart: CartItem[]
  priceMode: PriceMode
  currentCat: string
  searchQuery: string
  quantities: Record<number, number>
  selectedTones: Record<number, string>
  cartOpen: boolean
  adminOpen: boolean
  toast: ToastMessage | null
  discounts: Discount[]
  discountInput: string
  appliedDiscount: Discount | null
}
