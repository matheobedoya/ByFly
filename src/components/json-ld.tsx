import { CONFIG } from "@/lib/config"

const SCHEMA_TYPE: Record<string, string> = {
  catalog: "Store",
  services: "ProfessionalService",
  restaurant: "FoodEstablishment",
}

export function JsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[CONFIG.siteMode] ?? "LocalBusiness",
    "name": CONFIG.brandName as string,
    "description": CONFIG.seoDescription as string,
    "url": CONFIG.siteUrl as string,
    "telephone": `+${CONFIG.whatsapp as string}`,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "CO",
      "addressLocality": (CONFIG as Record<string, unknown>).city as string ?? "",
    },
    "areaServed": "CO",
  }

  const instagram = CONFIG.instagram as string
  if (instagram) data.sameAs = [instagram]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
