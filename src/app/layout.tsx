import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Jost, Geist_Mono } from "next/font/google"
import "./globals.css"
import { CONFIG } from "@/lib/config"
import { JsonLd } from "@/components/json-ld"

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
  themeColor: CONFIG.themeColor,
}

export const metadata: Metadata = {
  title: CONFIG.seoTitle,
  description: CONFIG.seoDescription,
  verification: {
    google: "5v1BYGnWoz9ixgM5nd2ab75RQn2YxgaZ2RLSAAb2MGw",
  },
  openGraph: {
    title: CONFIG.seoTitle,
    description: CONFIG.seoDescription,
    type: "website",
    url: CONFIG.siteUrl,
    images: [{ url: `${CONFIG.siteUrl}/og.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${CONFIG.siteUrl}/og.png`],
  },
}

const analyticsId = (CONFIG as Record<string, unknown>).analyticsId as string

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${jost.variable} ${geistMono.variable} h-full antialiased`}
    >
      {analyticsId && (
        <head>
          {/* Cloudflare Web Analytics — actívalo en dash.cloudflare.com > Analytics > Web Analytics */}
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token":"${analyticsId}"}`}
          />
        </head>
      )}
      <body className="min-h-full flex flex-col bg-pink-soft text-foreground overflow-x-hidden">
        <JsonLd />
        {children}
      </body>
    </html>
  )
}
