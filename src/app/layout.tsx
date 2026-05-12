import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Jost, Geist_Mono } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
})

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  themeColor: "#C2185B",
}

export const metadata: Metadata = {
  title: "BYFLY Makeup — Catálogo Oficial",
  description:
    "Catálogo de maquillaje multimarca BYFLY. Precios al detal y mayorista. Marcas colombianas e importadas. Envíos a toda Colombia.",
  openGraph: {
    title: "BYFLY Makeup — Catálogo",
    description:
      "Las mejores marcas de maquillaje colombianas e importadas. Precios al detal y mayorista.",
    type: "website",
    url: "https://byfly.netlify.app/",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${jost.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pink-soft text-foreground overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
