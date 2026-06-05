import type { Product, Variant, Banner } from "@/types"

export function fixDriveUrl(url: string, sz = "w600"): string {
  if (!url) return ""
  if (url.includes("thumbnail?id=") || url.includes("lh3.googleusercontent.com"))
    return url
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/)
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=${sz}`
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/)
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=${sz}`
  return url
}

function parseLine(line: string): string[] {
  const cols: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && !inQ) inQ = true
    else if (line[i] === '"' && inQ) inQ = false
    else if (line[i] === "," && !inQ) {
      cols.push(cur)
      cur = ""
    } else cur += line[i]
  }
  cols.push(cur)
  return cols
}

function parsePrice(v: string): number | null {
  const n = parseInt((v || "").replace(/[^\d]/g, ""))
  return isNaN(n) ? null : n
}

// Columns: 0:nombre 1:marca 2:cat 3:detal 4:mayor 5:img1 6:img2 7:img3
//          8:tono   9:surtido 10:badge 11:disponible 12:stock 13:costo
export function parseCsv(text: string): Product[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []

  const hdr = lines[0].toLowerCase()
  const hasHeader =
    hdr.includes("nombre") || hdr.includes("name") || hdr.includes("categoria")
  const data = hasHeader ? lines.slice(1) : lines

  const mapa = new Map<string, Product>()
  let pid = 1

  data.forEach((line) => {
    const cols = parseLine(line)
    const g = (i: number) => (cols[i] || "").trim().replace(/^"|"$/g, "")

    const name = g(0)
    if (!name) return

    const marca = g(1)
    const tono = g(8)
    const dispVal = g(11).toLowerCase()
    const stockVal = parseInt(g(12))
    const stock = isNaN(stockVal) ? null : stockVal
    const disponible = dispVal !== "no" && (stock === null || stock > 0)
    const variante: Variant = { tono, stock, disponible }

    let key = name + "||" + marca
    if (!mapa.has(key) && !marca) {
      mapa.forEach((_, k) => {
        if (k.startsWith(name + "||")) key = k
      })
    }

    if (mapa.has(key)) {
      const prod = mapa.get(key)!
      if (!prod.detal && parsePrice(g(3))) prod.detal = parsePrice(g(3))
      if (!prod.mayor && parsePrice(g(4))) prod.mayor = parsePrice(g(4))
      if (!prod.img1 && g(5)) prod.img1 = fixDriveUrl(g(5))
      if (!prod.img2 && g(6)) prod.img2 = fixDriveUrl(g(6))
      if (!prod.img3 && g(7)) prod.img3 = fixDriveUrl(g(7))
      if (!prod.cat && g(2)) prod.cat = g(2)
      prod.variantes.push(variante)
    } else {
      mapa.set(name + "||" + marca, {
        id: pid++,
        name,
        brand: marca,
        cat: g(2) || "Sin categoría",
        detal: parsePrice(g(3)),
        mayor: parsePrice(g(4)),
        img1: fixDriveUrl(g(5)),
        img2: fixDriveUrl(g(6)),
        img3: fixDriveUrl(g(7)),
        surtido: g(9).toLowerCase() === "si",
        badge: g(10),
        variantes: [variante],
      })
    }
  })

  return Array.from(mapa.values())
}

const BG_DEFAULTS = [
  "linear-gradient(135deg, #880E4F 0%, #C2185B 55%, #F06292 100%)",
  "linear-gradient(135deg, #4A148C 0%, #7B1FA2 55%, #CE93D8 100%)",
  "linear-gradient(135deg, #B71C1C 0%, #E53935 55%, #EF9A9A 100%)",
]

// Columns: 0:imagen_url 1:titulo 2:subtitulo 3:cta 4:activo
export function parseBannersCsv(text: string): Banner[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const hasHeader = lines[0].toLowerCase().includes("titulo") || lines[0].toLowerCase().includes("imagen")
  const data = hasHeader ? lines.slice(1) : lines
  const banners: Banner[] = []
  data.forEach((line, i) => {
    const cols = parseLine(line)
    const g = (idx: number) => (cols[idx] || "").trim().replace(/^"|"$/g, "")
    if (g(4).toLowerCase() === "no") return
    const rawImg = g(0)
    banners.push({
      id: i + 1,
      img: rawImg ? fixDriveUrl(rawImg, "w1600") : "",
      title: g(1),
      subtitle: g(2),
      cta: g(3) || "Ver más",
      ctaLink: "#",
      bg: BG_DEFAULTS[i % BG_DEFAULTS.length],
    })
  })
  return banners
}

export function getVariante(
  product: Product,
  tono: string
) {
  if (!product.variantes?.length) return null
  if (tono) return product.variantes.find((v) => v.tono === tono) ?? null
  return product.variantes[0]
}

export function isProductAgotado(product: Product): boolean {
  return !product.variantes.some(
    (v) => v.disponible && (v.stock === null || v.stock > 0)
  )
}
