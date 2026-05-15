import Link from "next/link"
import Image from "next/image"
import { CONFIG } from "@/lib/config"

export const metadata = {
  title: `Políticas y envíos — ${CONFIG.brandName}`,
  description: "Tiempos de envío, medios de pago, horarios de atención, política de envíos y devoluciones de BYFLY Makeup.",
}

const sections = [
  {
    id: "envios",
    icon: "🚚",
    title: "Tiempos de envío",
    placeholder: true,
    content: [
      "Despacho en 1-2 días hábiles tras confirmación del pago.",
      "Transportadora principal: Interrapidísimo.",
      "Tiempo de entrega estimado: 2-5 días hábiles según ciudad.",
    ],
  },
  {
    id: "pagos",
    icon: "💳",
    title: "Medios de pago",
    placeholder: true,
    content: [
      "Transferencia bancaria / Nequi / Daviplata.",
      "Contraentrega disponible en algunas ciudades (consultar).",
    ],
  },
  {
    id: "horarios",
    icon: "🕐",
    title: "Horarios de atención",
    placeholder: true,
    content: [
      "Lunes a viernes: 8:00 am – 6:00 pm",
      "Sábados: 9:00 am – 1:00 pm",
      "Domingos y festivos: no hay atención.",
    ],
  },
  {
    id: "politica-envios",
    icon: "📦",
    title: "Política de envíos",
    placeholder: true,
    content: [
      "El costo del envío lo asume el cliente y varía según la ciudad de destino.",
      "Los pedidos se empaquetan con cuidado para garantizar que lleguen en perfectas condiciones.",
      "Nos reservamos el derecho de cambiar la transportadora según disponibilidad.",
    ],
  },
  {
    id: "devoluciones",
    icon: "↩️",
    title: "Política de devoluciones",
    placeholder: true,
    content: [
      "Aceptamos cambios o devoluciones dentro de los 3 días hábiles siguientes a la recepción del pedido.",
      "El producto debe estar sin uso, en su empaque original y sin sellos rotos.",
      "No se aceptan devoluciones de productos de maquillaje abiertos por razones de higiene.",
      "Para iniciar un cambio o devolución contáctanos por WhatsApp con fotos del producto.",
    ],
  },
]

export default function Politicas() {
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
            Información importante
          </div>
          <h1 className="font-serif italic text-[2rem] md:text-[2.6rem] font-bold text-pink-dark leading-tight mb-3">
            Políticas y condiciones
          </h1>
          <p className="text-[#9e9e9e] text-sm max-w-md mx-auto leading-relaxed">
            Aquí encontrarás toda la información sobre envíos, pagos, horarios y condiciones de compra en {CONFIG.brandName}.
          </p>
        </div>

        {/* Aviso contenido pendiente */}
        <div className="mb-8 bg-[#fff8e1] border border-[#ffe082] rounded-2xl px-5 py-4 text-[13px] text-[#5d4037] flex gap-3 items-start">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <strong>Contenido provisional</strong> — Los textos de esta página deben ser revisados y completados con la información definitiva de la tienda antes de publicar.
          </div>
        </div>

        {/* Nav anclas */}
        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-[12px] font-medium text-pink-dark bg-white border border-[#f0d0dc] px-3.5 py-1.5 rounded-full hover:bg-pink hover:text-white hover:border-pink transition-all"
            >
              {s.icon} {s.title}
            </a>
          ))}
        </div>

        {/* Secciones */}
        <div className="flex flex-col gap-5">
          {sections.map((s) => (
            <div
              key={s.id}
              id={s.id}
              className="bg-white rounded-2xl border border-[#f0d0dc] px-6 py-5 shadow-[0_2px_12px_rgba(240,98,146,0.06)] scroll-mt-20"
            >
              <h2 className="font-serif italic text-[1.3rem] font-bold text-pink-dark flex items-center gap-2.5 mb-3">
                <span>{s.icon}</span>
                {s.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {s.content.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-[#555] leading-relaxed">
                    <span className="text-pink mt-0.5 flex-shrink-0">·</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contacto */}
        <div className="mt-10 bg-white rounded-2xl border border-[#f0d0dc] px-6 py-6 text-center shadow-[0_2px_12px_rgba(240,98,146,0.06)]">
          <p className="text-[14px] text-[#555] mb-4 leading-relaxed">
            ¿Tienes alguna pregunta sobre nuestras políticas?<br />Escríbenos y te respondemos rápido.
          </p>
          <a
            href={`https://wa.me/${CONFIG.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-white text-sm transition-all hover:scale-[1.02] bg-[#25D366] shadow-[0_4px_16px_rgba(37,211,102,0.3)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Preguntar por WhatsApp
          </a>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-[13px] text-pink hover:text-pink-dark transition-colors">
            ← Volver al catálogo
          </Link>
        </div>
      </main>
    </div>
  )
}
