"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useStore } from "@/contexts/store"
import { CONFIG, CAT_ICONS } from "@/lib/config"
import { parseCsv, isProductAgotado } from "@/lib/csv-parser"
import { writeToSheets } from "@/lib/sheets-writer"
import type { Product } from "@/types"
// @ts-ignore - XLSX has no official types bundle
import * as XLSX from "xlsx"

const CATS = ["Piel", "Labios", "Ojos", "Skincare", "Brochas", "Accesorios", "Importados"]
const BADGES_LIST = ["", "Bestseller", "Viral TikTok", "Nuevo", "Agotándose"]
const TABS = ["add", "edit", "list", "csv", "info"] as const
type Tab = (typeof TABS)[number]

const INPUT_CLS =
  "w-full px-[13px] py-[9px] border-[1.5px] border-[#f0d0dc] rounded-[10px] font-sans text-[13px] text-[#1a1a2e] outline-none transition-all focus:border-pink focus:shadow-[0_0_0_3px_rgba(240,98,146,0.08)] bg-white"
const BTN_PINK =
  "px-[22px] py-2.5 bg-pink text-white border-none rounded-[12px] font-sans text-[13px] font-medium cursor-pointer transition-all hover:bg-pink-dark"
const BTN_OUTLINE =
  "px-[18px] py-[9px] bg-transparent text-pink-dark border-[1.5px] border-pink rounded-[12px] font-sans text-[13px] cursor-pointer transition-all hover:bg-pink-light"

export function AdminPanel() {
  const { state, dispatch, showToast, reloadSheets } = useStore()
  const { adminOpen, products } = state

  const [showLogin, setShowLogin] = useState(true)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState(0)
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>("add")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [listSearch, setListSearch] = useState("")
  const [editSearch, setEditSearch] = useState("")
  const [csvData, setCsvData] = useState<Product[] | null>(null)
  const [csvPreview, setCsvPreview] = useState("")
  const [okMsg, setOkMsg] = useState("")

  // Add form state
  const [addForm, setAddForm] = useState({
    name: "", brand: "", cat: "Piel", badge: "", detal: "", mayor: "",
    img1: "", img2: "", img3: "", tono: "", stock: "", disponible: "si", surtido: "",
  })
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "", brand: "", cat: "Piel", badge: "", detal: "", mayor: "",
    img1: "", img2: "", img3: "", disponible: "si", surtido: "",
  })

  const close = () => {
    dispatch({ type: "SET_ADMIN_OPEN", open: false })
    setShowLogin(true)
    setPassword("")
    setLoginError(false)
    setLoginAttempts(0)
    setLockUntil(0)
  }

  const checkLogin = () => {
    const now = Date.now()
    if (now < lockUntil) return

    if (password === CONFIG.adminPassword) {
      setShowLogin(false)
      setLoginError(false)
      setLoginAttempts(0)
    } else {
      const next = loginAttempts + 1
      setLoginAttempts(next)
      setLoginError(true)
      setPassword("")
      if (next >= 3) {
        const until = now + 30_000
        setLockUntil(until)
        setLockSecondsLeft(30)
        const iv = setInterval(() => {
          const left = Math.ceil((until - Date.now()) / 1000)
          if (left <= 0) {
            clearInterval(iv)
            setLockSecondsLeft(0)
            setLoginAttempts(0)
            setLoginError(false)
          } else {
            setLockSecondsLeft(left)
          }
        }, 500)
      }
    }
  }

  const showOk = (msg: string) => {
    setOkMsg(msg)
    setTimeout(() => setOkMsg(""), 2800)
  }

  const addProduct = () => {
    const name = addForm.name.trim()
    const detal = parseInt(addForm.detal)
    if (!name || isNaN(detal)) { showToast("⚠️ Nombre y precio detal son obligatorios"); return }

    const sv = parseInt(addForm.stock)
    const stock = isNaN(sv) ? null : sv
    const disp = addForm.disponible !== "no" && (stock === null || stock > 0)
    const variante = { tono: addForm.tono.trim(), stock, disponible: disp }
    const marca = addForm.brand.trim()

    const exist = products.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && (p.brand || "").toLowerCase() === marca.toLowerCase()
    )
    if (exist) {
      dispatch({ type: "UPDATE_LOCAL_PRODUCT", id: exist.id, updates: { variantes: [...exist.variantes, variante] } })
      showToast("✅ Tono agregado al producto existente")
      return
    }

    const newId = Math.max(0, ...products.map((p) => p.id)) + 1
    const newProduct: Product = {
      id: newId, name, cat: addForm.cat, brand: marca,
      detal, mayor: parseInt(addForm.mayor) || null,
      img1: addForm.img1.trim(), img2: addForm.img2.trim(), img3: addForm.img3.trim(),
      surtido: addForm.surtido === "si", badge: addForm.badge,
      variantes: [variante],
    }
    writeToSheets([...products, newProduct])
    dispatch({ type: "ADD_LOCAL_PRODUCT", product: newProduct })
    setAddForm({ name: "", brand: "", cat: "Piel", badge: "", detal: "", mayor: "", img1: "", img2: "", img3: "", tono: "", stock: "", disponible: "si", surtido: "" })
    showOk("✅ ¡Producto agregado!")
  }

  const openEdit = (id: number) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setEditingId(id)
    setEditForm({
      name: p.name, brand: p.brand || "", cat: p.cat, badge: p.badge || "",
      detal: String(p.detal || ""), mayor: String(p.mayor || ""),
      img1: p.img1 || "", img2: p.img2 || "", img3: p.img3 || "",
      disponible: p.variantes.some((v) => v.disponible) ? "si" : "no",
      surtido: p.surtido ? "si" : "",
    })
  }

  const saveEdit = () => {
    if (!editingId) return
    const updates: Partial<Product> = {
      name: editForm.name.trim(),
      brand: editForm.brand.trim(),
      detal: parseInt(editForm.detal) || null,
      mayor: parseInt(editForm.mayor) || null,
      cat: editForm.cat,
      badge: editForm.badge,
      img1: editForm.img1.trim(),
      img2: editForm.img2.trim(),
      img3: editForm.img3.trim(),
      surtido: editForm.surtido === "si",
    }
    const p = products.find((x) => x.id === editingId)
    if (p && editForm.disponible === "no") {
      updates.variantes = p.variantes.map((v) => ({ ...v, disponible: false }))
    }
    const updatedProds = products.map((p) => p.id === editingId ? { ...p, ...updates } : p)
    writeToSheets(updatedProds)
    dispatch({ type: "UPDATE_LOCAL_PRODUCT", id: editingId, updates })
    showOk("✅ ¡Actualizado!")
  }

  const deleteSingle = (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return
    const remaining = products.filter((p) => p.id !== id)
    writeToSheets(remaining)
    dispatch({ type: "DELETE_LOCAL_PRODUCTS", ids: [id] })
  }

  const handleFile = (file: File) => {
    if (file.name.match(/\.xlsx?$/i)) {
      const r = new FileReader()
      r.onload = (e) => {
        try {
          const wb = XLSX.read(e.target!.result, { type: "array" })
          const parsed = parseCsv(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]))
          showCsvPreview(parsed)
        } catch { showToast("❌ Error leyendo Excel") }
      }
      r.readAsArrayBuffer(file)
    } else {
      const r = new FileReader()
      r.onload = (e) => showCsvPreview(parseCsv(e.target!.result as string))
      r.readAsText(file, "UTF-8")
    }
  }

  const showCsvPreview = (parsed: Product[]) => {
    if (!parsed.length) { setCsvPreview("❌ No se encontraron productos válidos."); setCsvData(null); return }
    setCsvData(parsed)
    const preview = parsed.slice(0, 5).map((p) => {
      const vs = p.variantes.map((v) => `${v.tono || "—"}:${v.stock ?? "∞"}`).join(" ")
      return `● ${p.name}${p.brand ? ` (${p.brand})` : ""} | ${p.cat} | D:$${p.detal || "—"} | ${vs}`
    }).join("\n")
    setCsvPreview(`${parsed.length} productos — Vista previa:\n\n${preview}${parsed.length > 5 ? `\n...y ${parsed.length - 5} más` : ""}`)
  }

  const importCsv = () => {
    if (!csvData?.length || !confirm(`¿Reemplazar ${products.length} productos con ${csvData.length}?`)) return
    writeToSheets(csvData)
    dispatch({ type: "REPLACE_PRODUCTS", products: csvData })
    setCsvData(null)
    setCsvPreview("")
    showOk("✅ ¡Catálogo actualizado!")
    showToast(`✅ ${csvData.length} productos importados`)
  }

  const filteredForList = products.filter((p) => {
    const s = listSearch.toLowerCase()
    return !s || p.name.toLowerCase().includes(s) || (p.brand || "").toLowerCase().includes(s)
  })
  const filteredForEdit = products.filter((p) => {
    const s = editSearch.toLowerCase()
    return !s || p.name.toLowerCase().includes(s) || (p.brand || "").toLowerCase().includes(s)
  })

  if (!adminOpen) return null

  return (
    <div className="fixed inset-0 bg-[rgba(26,26,46,0.6)] z-[300] backdrop-blur-[3px] flex items-center justify-center p-4">
      <AnimatePresence>
        {showLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-[20px] w-[min(360px,100%)] p-9 text-center shadow-[0_24px_80px_rgba(136,14,79,0.25)]"
          >
            <div className="text-[44px] mb-2">🔐</div>
            <h3 className="font-serif text-2xl text-pink-dark mb-1.5">Panel Admin</h3>
            <p className="text-sm text-[#9e9e9e] mb-5">Ingresa tu contraseña para administrar el catálogo</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkLogin()}
              placeholder="Contraseña..."
              disabled={lockSecondsLeft > 0}
              className={`${INPUT_CLS} mb-3 ${lockSecondsLeft > 0 ? "opacity-50" : ""}`}
            />
            {lockSecondsLeft > 0 && (
              <p className="text-[#e53935] text-xs mb-2 font-medium">
                🔒 Bloqueado por {lockSecondsLeft}s — demasiados intentos fallidos
              </p>
            )}
            {loginError && lockSecondsLeft === 0 && (
              <p className="text-[#e53935] text-xs mb-2">
                Contraseña incorrecta {loginAttempts > 0 && `(intento ${loginAttempts}/3)`}
              </p>
            )}
            <button
              onClick={checkLogin}
              disabled={lockSecondsLeft > 0}
              className={`${BTN_PINK} w-full mb-2.5 ${lockSecondsLeft > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Entrar
            </button>
            <button onClick={close} className={`${BTN_OUTLINE} w-full`}>Cancelar</button>
          </motion.div>
        ) : (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-[22px] w-[min(680px,100%)] max-h-[94vh] overflow-y-auto shadow-[0_24px_80px_rgba(136,14,79,0.25)]"
          >
            {/* Admin header */}
            <div
              className="px-[26px] py-5 flex items-center justify-between sticky top-0 z-10 rounded-t-[22px]"
              style={{ background: "linear-gradient(135deg,#880E4F,#C2185B)" }}
            >
              <h2 className="font-serif text-[21px] font-bold text-white">⚙️ Admin BYFLY</h2>
              <button onClick={close} className="bg-white/15 border-none text-white w-8 h-8 rounded-full cursor-pointer text-lg flex items-center justify-center">✕</button>
            </div>

            <div className="p-[20px_26px]">
              {/* Tabs */}
              <div className="flex gap-1.5 mb-5 flex-wrap">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-[15px] py-1.5 rounded-[25px] border-[1.5px] font-sans text-xs font-medium cursor-pointer transition-all ${activeTab === t ? "bg-pink border-pink text-white" : "bg-white border-[#f0d0dc] text-[#9e9e9e] hover:border-pink hover:text-pink"}`}
                  >
                    {t === "add" ? "➕ Agregar" : t === "edit" ? "✏️ Editar" : t === "list" ? "📋 Lista" : t === "csv" ? "📤 CSV" : "💡 Guía"}
                  </button>
                ))}
              </div>

              {!CONFIG.scriptsWriteUrl && (
                <div className="px-[13px] py-[9px] bg-[#fff8e1] text-[#f57f17] rounded-[10px] text-[12px] mb-4 leading-relaxed">
                  ⚠️ <strong>Sync con Sheets desactivado.</strong> Los cambios se guardan localmente y se pierden al recargar. Configura <code className="bg-[#fff3cd] px-1 rounded">scriptsWriteUrl</code> en config.ts para persistir en Google Sheets.
                </div>
              )}

              {okMsg && (
                <div className="px-[13px] py-[9px] bg-[#e8f5e9] text-[#2e7d32] rounded-[10px] text-[13px] mb-4">
                  {okMsg}
                </div>
              )}

              {/* ADD TAB */}
              {activeTab === "add" && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Nombre *</label>
                      <input className={INPUT_CLS} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Ej: Base Ani-K" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Marca</label>
                      <input className={INPUT_CLS} value={addForm.brand} onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })} placeholder="Ej: Ani-K" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Categoría *</label>
                      <select className={INPUT_CLS} value={addForm.cat} onChange={(e) => setAddForm({ ...addForm, cat: e.target.value })}>
                        {CATS.map((c) => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Badge</label>
                      <select className={INPUT_CLS} value={addForm.badge} onChange={(e) => setAddForm({ ...addForm, badge: e.target.value })}>
                        {BADGES_LIST.map((b) => <option key={b} value={b}>{b || "Sin badge"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Precio Detal ($) *</label>
                      <input type="number" className={INPUT_CLS} value={addForm.detal} onChange={(e) => setAddForm({ ...addForm, detal: e.target.value })} placeholder="44000" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Precio Mayorista ($)</label>
                      <input type="number" className={INPUT_CLS} value={addForm.mayor} onChange={(e) => setAddForm({ ...addForm, mayor: e.target.value })} placeholder="36000" />
                    </div>
                  </div>
                  {["img1", "img2", "img3"].map((f, i) => (
                    <div key={f} className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Imagen {i + 1}{i > 0 ? " (opcional)" : ""}</label>
                      <input className={INPUT_CLS} value={(addForm as Record<string, string>)[f]} onChange={(e) => setAddForm({ ...addForm, [f]: e.target.value })} placeholder="https://drive.google.com/thumbnail?id=..." />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Tono</label>
                      <input className={INPUT_CLS} value={addForm.tono} onChange={(e) => setAddForm({ ...addForm, tono: e.target.value })} placeholder="Ej: 01" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Stock</label>
                      <input type="number" className={INPUT_CLS} value={addForm.stock} onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })} placeholder="10" min="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">¿Disponible?</label>
                      <select className={INPUT_CLS} value={addForm.disponible} onChange={(e) => setAddForm({ ...addForm, disponible: e.target.value })}>
                        <option value="si">Sí ✅</option>
                        <option value="no">No — Agotado ❌</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">¿Surtido?</label>
                      <select className={INPUT_CLS} value={addForm.surtido} onChange={(e) => setAddForm({ ...addForm, surtido: e.target.value })}>
                        <option value="">No</option>
                        <option value="si">Sí ⚠️</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={addProduct} className={BTN_PINK}>✅ Agregar</button>
                    <button onClick={() => setAddForm({ name: "", brand: "", cat: "Piel", badge: "", detal: "", mayor: "", img1: "", img2: "", img3: "", tono: "", stock: "", disponible: "si", surtido: "" })} className={BTN_OUTLINE}>Limpiar</button>
                  </div>
                  <p className="text-[11px] text-[#9e9e9e] leading-relaxed">💡 Los cambios se sincronizan automáticamente con Google Sheets si <code className="bg-[#f5f5f5] px-1 rounded">scriptsWriteUrl</code> está configurado.</p>
                </div>
              )}

              {/* EDIT TAB */}
              {activeTab === "edit" && (
                <div>
                  <input className={`${INPUT_CLS} mb-3`} value={editSearch} onChange={(e) => setEditSearch(e.target.value)} placeholder="Buscar producto o marca..." />
                  <div className="flex flex-col gap-[7px] max-h-[200px] overflow-y-auto mb-3">
                    {filteredForEdit.slice(0, 20).map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 p-[10px_12px] border border-[#f0d0dc] rounded-[12px] bg-pink-soft hover:border-pink-mid transition-all">
                        <div className="text-[17px]">{CAT_ICONS[p.cat] || "📦"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{p.name}{isProductAgotado(p) ? " ❌" : ""}</div>
                          <div className="text-[11px] text-pink">{p.cat}{p.brand ? ` · ${p.brand}` : ""}</div>
                        </div>
                        <button onClick={() => openEdit(p.id)} className="bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb] px-[11px] py-[5px] rounded-[8px] cursor-pointer text-[11px] font-sans transition-all hover:bg-[#1565c0] hover:text-white">✏️</button>
                      </div>
                    ))}
                  </div>
                  {editingId && (
                    <div className="bg-pink-soft rounded-[14px] p-[15px] border border-[#f0d0dc]">
                      <div className="flex justify-between items-center mb-3">
                        <strong className="text-[13px] text-pink-dark">Editando producto</strong>
                        <button onClick={() => setEditingId(null)} className={BTN_OUTLINE + " text-[11px] py-1 px-2.5"}>Cerrar</button>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Nombre</label><input className={INPUT_CLS} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Marca</label><input className={INPUT_CLS} value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Precio Detal</label><input type="number" className={INPUT_CLS} value={editForm.detal} onChange={(e) => setEditForm({ ...editForm, detal: e.target.value })} /></div>
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Precio Mayorista</label><input type="number" className={INPUT_CLS} value={editForm.mayor} onChange={(e) => setEditForm({ ...editForm, mayor: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Categoría</label><select className={INPUT_CLS} value={editForm.cat} onChange={(e) => setEditForm({ ...editForm, cat: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}</select></div>
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Badge</label><select className={INPUT_CLS} value={editForm.badge} onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}>{BADGES_LIST.map((b) => <option key={b} value={b}>{b || "Sin badge"}</option>)}</select></div>
                        </div>
                        {["img1", "img2", "img3"].map((f, i) => (
                          <div key={f} className="flex flex-col gap-1">
                            <label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">Imagen {i + 1}</label>
                            <input className={INPUT_CLS} value={(editForm as Record<string, string>)[f]} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">¿Disponible?</label><select className={INPUT_CLS} value={editForm.disponible} onChange={(e) => setEditForm({ ...editForm, disponible: e.target.value })}><option value="si">Sí ✅</option><option value="no">No ❌</option></select></div>
                          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-pink-dark uppercase tracking-[0.5px]">¿Surtido?</label><select className={INPUT_CLS} value={editForm.surtido} onChange={(e) => setEditForm({ ...editForm, surtido: e.target.value })}><option value="">No</option><option value="si">Sí ⚠️</option></select></div>
                        </div>
                        <button onClick={saveEdit} className={BTN_PINK}>💾 Guardar cambios</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LIST TAB */}
              {activeTab === "list" && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <input className={`${INPUT_CLS} flex-1 min-w-[160px]`} value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Buscar..." />
                    <span className="text-[11px] text-[#9e9e9e]">{filteredForList.length} de {products.length}</span>
                  </div>
                  <div className="flex flex-col gap-[7px] max-h-[360px] overflow-y-auto">
                    {filteredForList.map((p) => {
                      const ag = isProductAgotado(p)
                      const st = p.variantes.reduce((s, v) => s + (v.stock || 0), 0)
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 p-[10px_12px] border border-[#f0d0dc] rounded-[12px] bg-pink-soft hover:border-pink-mid transition-all">
                          <div className="text-[17px]">{CAT_ICONS[p.cat] || "📦"}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium truncate">{p.name}{ag ? " ❌ Agotado" : ""}</div>
                            <div className="text-[11px] text-pink">{p.cat}{p.brand ? ` · ${p.brand}` : ""} · D:${p.detal || "—"} M:${p.mayor || "—"} · Stock:{st}</div>
                          </div>
                          <button onClick={() => deleteSingle(p.id)} className="bg-[#ffebee] text-[#c62828] border border-[#ffcdd2] px-[11px] py-[5px] rounded-[8px] cursor-pointer text-[11px] font-sans transition-all hover:bg-[#c62828] hover:text-white">🗑️</button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-2.5 mt-3 flex-wrap">
                    <button onClick={async () => { if (confirm("¿Recargar desde Google Sheets?")) await reloadSheets() }} className={BTN_OUTLINE + " text-[12px]"}>🔄 Recargar desde Sheets</button>
                  </div>
                </div>
              )}

              {/* CSV TAB */}
              {activeTab === "csv" && (
                <div>
                  <p className="text-xs text-[#9e9e9e] mb-3.5 leading-relaxed">
                    Columnas: <code className="bg-[#f5f5f5] px-1.5 py-[1px] rounded text-[11px]">nombre, marca, categoria, precio_detal, precio_mayor, imagen_url, imagen_url2, imagen_url3, tono, surtido, badge, disponible, stock</code><br /><br />
                    Solo rellena categoría, precios e imágenes en la <strong>primera fila</strong> del producto.
                  </p>
                  <div
                    className="border-2 border-dashed border-[#f0d0dc] rounded-[14px] p-[26px_20px] text-center cursor-pointer transition-all hover:border-pink hover:bg-pink-light bg-pink-soft"
                    onClick={() => document.getElementById("csv-file-input")?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  >
                    <div className="text-[34px]">📂</div>
                    <p className="text-[13px] font-medium mt-2">Clic o arrastra tu archivo aquí</p>
                    <p className="text-[11px] text-[#9e9e9e] mt-1">CSV o Excel (.xlsx)</p>
                  </div>
                  <input id="csv-file-input" type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  {csvPreview && (
                    <pre className="bg-[#f9f9f9] rounded-[10px] p-[11px_14px] text-[11px] text-[#1a1a2e] mt-2.5 max-h-[140px] overflow-y-auto border border-[#f0d0dc] leading-relaxed whitespace-pre-wrap">
                      {csvPreview}
                    </pre>
                  )}
                  {csvData && (
                    <div className="flex gap-2.5 mt-1.5">
                      <button onClick={importCsv} className={BTN_PINK}>✅ Confirmar</button>
                      <button onClick={() => { setCsvData(null); setCsvPreview("") }} className={BTN_OUTLINE}>Cancelar</button>
                    </div>
                  )}
                </div>
              )}

              {/* INFO TAB */}
              {activeTab === "info" && (
                <div className="bg-pink-soft rounded-[14px] p-[18px] border border-[#f0d0dc] text-[13px] leading-[1.8] text-[#555]">
                  <strong className="text-pink-dark text-sm">💡 Guía rápida</strong><br /><br />
                  <strong>¿Cómo funciona el sync con Google Sheets?</strong><br />
                  Cada vez que agregas, editas o eliminas un producto, el catálogo completo se envía al Apps Script Web App y reemplaza la hoja. Requiere configurar <code className="bg-[#f5f5f5] px-1 rounded">scriptsWriteUrl</code> en <code className="bg-[#f5f5f5] px-1 rounded">src/lib/config.ts</code>.<br /><br />
                  <strong>¿Los cambios se ven de inmediato en el catálogo?</strong><br />
                  El catálogo tiene caché de 30 min. Usa Admin → Lista → <strong>Recargar desde Sheets</strong> para ver los cambios al instante.<br /><br />
                  <strong>Estructura — una fila por tono:</strong><br />
                  Solo rellena categoría, precios e imágenes en la primera fila. Las demás solo necesitan <code className="bg-[#f5f5f5] px-1 py-[1px] rounded">nombre</code>, <code className="bg-[#f5f5f5] px-1 py-[1px] rounded">tono</code>, <code className="bg-[#f5f5f5] px-1 py-[1px] rounded">disponible</code> y <code className="bg-[#f5f5f5] px-1 py-[1px] rounded">stock</code>.<br /><br />
                  <strong>Última unidad:</strong> cuando queda exactamente 1 unidad de un tono, el chip se pone en rojo.<br /><br />
                  <strong>Imágenes Drive:</strong> <code className="bg-[#f5f5f5] px-1 py-[1px] rounded text-[11px]">https://drive.google.com/thumbnail?id=FILE_ID&sz=w600</code>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
