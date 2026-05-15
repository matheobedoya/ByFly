import Link from "next/link"
import Image from "next/image"
import { CONFIG } from "@/lib/config"

export const metadata = {
  title: `¿Cómo hacer mi pedido? — ${CONFIG.brandName}`,
  description: "Paso a paso para hacer tu pedido en BYFLY Makeup. Fácil, rápido y por WhatsApp.",
}

const steps = [
  {
    num: "01",
    icon: "🔍",
    title: "Explora el catálogo",
    desc: "Navega por nuestras categorías: Piel, Labios, Ojos, Skincare, Brochas, Accesorios e Importados. Usa el buscador para encontrar un producto o marca específica.",
  },
  {
    num: "02",
    icon: "💄",
    title: "Elige tus productos",
    desc: "Haz clic en el producto que te gusta. Si tiene tonos disponibles, selecciona el que prefieras antes de agregar al carrito.",
  },
  {
    num: "03",
    icon: "🛒",
    title: "Agrega al carrito",
    desc: "Pulsa el botón de carrito en la tarjeta del producto. Puedes agregar varios productos y ajustar las cantidades directamente en el carrito.",
  },
  {
    num: "04",
    icon: "💰",
    title: "Elige tu precio",
    desc: "Selecciona entre precio Detal o Mayorista en la parte superior. Para acceder al precio mayorista necesitas un pedido mínimo de $130.000.",
  },
  {
    num: "05",
    icon: "📋",
    title: "Revisa tu pedido",
    desc: "Abre el carrito con el botón 🛒, confirma los productos, cantidades y el total. Si tienes un código de descuento, ingrésalo aquí.",
  },
  {
    num: "06",
    icon: "📱",
    title: "Envía por WhatsApp",
    desc: 'Escribe tu nombre y ciudad, y pulsa "Enviar pedido por WhatsApp". Tu pedido llegará directamente a nuestro número con todos los detalles.',
  },
  {
    num: "07",
    icon: "✅",
    title: "Confirmación y pago",
    desc: "Te confirmaremos disponibilidad, te enviaremos los datos de pago y coordinaremos el despacho. ¡Listo!",
  },
]

export default function ComoHacerPedido() {
  return (
    <div className="min-h-screen bg-pink-soft">
      {/* Header simple */}
      <header
        className="sticky top-0 z-50 shadow-[0_2px_20px_rgba(136,14,79,0.2)]"
        style={{ background: "linear-gradient(135deg,#880E4F,#C2185B,#F06292)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-[38px] w-[38px]">
              <Image src={CONFIG.logo} alt={CONFIG.brandName} fill className="object-contain brightness-0 invert" />
            </div>
            <div>
              <div className="font-serif text-xl font-bold text-white leading-none">{CONFIG.brandName}</div>
              <div className="text-[9px] tracking-[4px] text-white/80 uppercase">{CONFIG.brandSub}</div>
            </div>
          </Link>
          <Link
            href="/"
            className="text-white/85 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-5 py-10 lg:py-16">
        {/* Título */}
        <div className="text-center mb-10">
          <div className="inline-block bg-pink-light border border-[#f0d0dc] rounded-full px-4 py-1.5 text-xs text-pink font-medium mb-4">
            Guía rápida
          </div>
          <h1 className="font-serif italic text-[2rem] md:text-[2.6rem] font-bold text-pink-dark leading-tight mb-3">
            ¿Cómo hacer mi pedido?
          </h1>
          <p className="text-[#9e9e9e] text-sm max-w-md mx-auto leading-relaxed">
            En 7 sencillos pasos. Sin registro, sin contraseñas — solo encuentra lo que quieres y envíanos tu pedido por WhatsApp.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="flex gap-4 bg-white rounded-2xl border border-[#f0d0dc] px-5 py-4 shadow-[0_2px_12px_rgba(240,98,146,0.06)]"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-light border-2 border-pink flex items-center justify-center font-serif font-bold text-pink-dark text-sm">
                {step.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{step.icon}</span>
                  <h2 className="font-semibold text-[#1a1a2e] text-[15px]">{step.title}</h2>
                </div>
                <p className="text-[13px] text-[#9e9e9e] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[14px] font-semibold text-white text-sm transition-all hover:scale-[1.02] shadow-[0_4px_20px_rgba(194,24,91,0.3)]"
            style={{ background: "linear-gradient(135deg,#880E4F,#C2185B)" }}
          >
            🛍️ Ir al catálogo
          </Link>
          <div className="mt-4 text-[12px] text-[#9e9e9e]">
            ¿Dudas? Escríbenos directo a{" "}
            <a
              href={`https://wa.me/${CONFIG.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink font-medium hover:underline"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
