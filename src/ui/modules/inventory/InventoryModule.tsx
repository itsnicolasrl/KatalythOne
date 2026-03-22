"use client";

import * as React from "react";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  quantityOnHand: number;
  lowStockThreshold: number | null;
  costCentsPerUnit: number | null;
  notes: string | null;
};

type Movement = {
  id: string;
  direction: "IN" | "OUT";
  quantity: number;
  occurredAt: string;
  note: string | null;
  item: { id: string; name: string; unit: string };
};

// ── helpers ──────────────────────────────────────────────
function money(cents: number | null) {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function dateToInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

const inputCls = "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

type TabKey = "items" | "movements";

export function InventoryModule() {
  const [tab, setTab] = React.useState<TabKey>("items");
  const [items, setItems] = React.useState<Item[]>([]);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [showItemForm, setShowItemForm] = React.useState(false);
  const [showMovForm, setShowMovForm] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  const [itemForm, setItemForm] = React.useState({
    name: "", sku: "", unit: "ud", quantityOnHand: "0",
    lowStockThreshold: "", costPerUnit: "", notes: "",
  });

  const [movForm, setMovForm] = React.useState({
    itemId: "", direction: "IN" as "IN" | "OUT",
    quantity: "1", occurredAt: dateToInputValue(new Date()), note: "",
  });

  async function loadItems() {
    const res = await fetch("/api/inventory/items", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar inventario");
    setItems(data?.items ?? []);
  }

  async function loadMovements() {
    const res = await fetch("/api/inventory/movements", { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar movimientos");
    setMovements(data?.movements ?? []);
  }

  async function loadAll() {
    setLoading(true); setError(null);
    try { await Promise.all([loadItems(), loadMovements()]); }
    catch (e) { setError(e instanceof Error ? e.message : "Error de red"); }
    finally { setLoading(false); }
  }

  React.useEffect(() => { void loadAll(); }, []);

  function resetItemForm() {
    setEditingItemId(null);
    setItemForm({ name: "", sku: "", unit: "ud", quantityOnHand: "0", lowStockThreshold: "", costPerUnit: "", notes: "" });
    setShowItemForm(false);
  }

  function startEditItem(it: Item) {
    setEditingItemId(it.id);
    setItemForm({
      name: it.name, sku: it.sku ?? "", unit: it.unit,
      quantityOnHand: String(it.quantityOnHand),
      lowStockThreshold: it.lowStockThreshold !== null ? String(it.lowStockThreshold) : "",
      costPerUnit: it.costCentsPerUnit !== null ? (it.costCentsPerUnit / 100).toFixed(2) : "",
      notes: it.notes ?? "",
    });
    setShowItemForm(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const low = itemForm.lowStockThreshold.trim();
      const cost = itemForm.costPerUnit.trim();
      const payload = {
        name: itemForm.name.trim(), sku: itemForm.sku.trim() || null,
        unit: itemForm.unit.trim() || "ud",
        lowStockThreshold: low === "" ? null : Number(low),
        costPerUnit: cost === "" ? null : Number(cost),
        notes: itemForm.notes.trim() || null,
      };
      const res = editingItemId
        ? await fetch(`/api/inventory/items/${editingItemId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify(payload),
          })
        : await fetch("/api/inventory/items", {
            method: "POST", headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...payload, quantityOnHand: Number(itemForm.quantityOnHand) || 0 }),
          });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      resetItemForm();
      await loadAll();
    } catch (err) { setError(err instanceof Error ? err.message : "Error de red"); }
    finally { setLoading(false); }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("¿Eliminar este producto y todo su historial?")) return;
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/inventory/items/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await loadAll();
    } catch (err) { setError(err instanceof Error ? err.message : "Error de red"); }
    finally { setBusyId(null); }
  }

  async function saveMovement(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          itemId: movForm.itemId, direction: movForm.direction,
          quantity: Number(movForm.quantity),
          occurredAt: new Date(movForm.occurredAt + "T12:00:00").toISOString(),
          note: movForm.note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo registrar movimiento");
      setMovForm((p) => ({ ...p, quantity: "1", note: "", occurredAt: dateToInputValue(new Date()) }));
      setShowMovForm(false);
      await loadAll();
    } catch (err) { setError(err instanceof Error ? err.message : "Error de red"); }
    finally { setLoading(false); }
  }

  const lowStockItems = items.filter(it => it.lowStockThreshold !== null && it.quantityOnHand <= it.lowStockThreshold);

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-5 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right,rgba(242,135,5,0.2) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Control de inventario
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Inventario</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} producto{items.length !== 1 ? "s" : ""}
              {lowStockItems.length > 0 ? ` · ${lowStockItems.length} con stock bajo` : ""}
              {` · ${movements.length} movimiento${movements.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              {([["items", "Productos"], ["movements", "Movimientos"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={["px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    tab === key ? "bg-[#F28705] text-white" : "text-white/50 hover:text-white"].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => tab === "items" ? setShowItemForm(true) : setShowMovForm(true)}
              className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {tab === "items" ? "Nuevo producto" : "Nuevo movimiento"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Alerta stock bajo */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p className="text-xs font-semibold text-amber-700">
            Stock bajo: {lowStockItems.map(it => `${it.name} (${it.quantityOnHand} ${it.unit})`).join(" · ")}
          </p>
        </div>
      )}

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Productos", value: items.length, color: "text-black", bg: "bg-[#F5F4F2]" },
            { label: "Stock bajo", value: lowStockItems.length, color: lowStockItems.length > 0 ? "text-amber-600" : "text-black/40", bg: lowStockItems.length > 0 ? "bg-amber-50" : "bg-[#F5F4F2]" },
            { label: "Movimientos", value: movements.length, color: "text-[#F28705]", bg: "bg-[#FFF3E0]" },
            { label: "Entradas", value: movements.filter(m => m.direction === "IN").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs font-bold text-black/50">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: PRODUCTOS ── */}
      {tab === "items" && (
        <>
          {/* Formulario producto */}
          {showItemForm && (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black">{editingItemId ? "Editar producto" : "Nuevo producto"}</p>
                  <p className="text-[10px] text-black/40 mt-0.5">
                    {editingItemId ? "El stock se actualiza solo con movimientos" : "Define el producto y stock inicial"}
                  </p>
                </div>
                <button onClick={resetItemForm} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={saveItem} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
                  <div className="md:col-span-2 xl:col-span-1">
                    <label className={labelCls}>Nombre *</label>
                    <input type="text" required value={itemForm.name} onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Camiseta talla M" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>SKU (opcional)</label>
                    <input type="text" value={itemForm.sku} onChange={(e) => setItemForm(p => ({ ...p, sku: e.target.value }))} placeholder="CAM-M-001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Unidad</label>
                    <input type="text" value={itemForm.unit} onChange={(e) => setItemForm(p => ({ ...p, unit: e.target.value }))} placeholder="ud, kg, L..." className={inputCls} />
                  </div>
                  {!editingItemId && (
                    <div>
                      <label className={labelCls}>Stock inicial</label>
                      <input type="number" min="0" value={itemForm.quantityOnHand} onChange={(e) => setItemForm(p => ({ ...p, quantityOnHand: e.target.value }))} className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Alerta stock bajo</label>
                    <input type="number" min="0" value={itemForm.lowStockThreshold} onChange={(e) => setItemForm(p => ({ ...p, lowStockThreshold: e.target.value }))} placeholder="Ej: 5" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Costo unitario</label>
                    <input type="text" value={itemForm.costPerUnit} onChange={(e) => setItemForm(p => ({ ...p, costPerUnit: e.target.value }))} placeholder="0.00" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Notas (opcional)</label>
                    <input type="text" value={itemForm.notes} onChange={(e) => setItemForm(p => ({ ...p, notes: e.target.value }))} placeholder="Contexto adicional..." className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetItemForm} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl">
                    {loading ? <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg> : null}
                    {loading ? "Guardando..." : editingItemId ? "Actualizar" : "Crear producto"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista productos */}
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
              <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <p className="text-sm font-black text-black mb-1">Sin productos aún</p>
              <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Registra productos para controlar stock y movimientos.</p>
              <button onClick={() => setShowItemForm(true)} className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
                Crear primer producto
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
                {[
                  { label: "Producto", col: "col-span-4" },
                  { label: "Stock", col: "col-span-2" },
                  { label: "Umbral", col: "col-span-1" },
                  { label: "Costo ud.", col: "col-span-2" },
                  { label: "SKU", col: "col-span-1" },
                  { label: "", col: "col-span-2 text-right" },
                ].map(({ label, col }) => (
                  <div key={label} className={col}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
                  </div>
                ))}
              </div>
              {items.map((it) => {
                const isLow = it.lowStockThreshold !== null && it.quantityOnHand <= it.lowStockThreshold;
                const isBusy = busyId === it.id;
                return (
                  <div key={it.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#F28705]">
                        {initials(it.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-black truncate">{it.name}</p>
                        {it.notes && <p className="text-[10px] text-black/40 truncate">{it.notes}</p>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-black ${isLow ? "text-amber-600" : "text-black"}`}>
                          {it.quantityOnHand}
                        </span>
                        <span className="text-xs text-black/40">{it.unit}</span>
                        {isLow && (
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Bajo</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-black/50">{it.lowStockThreshold ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-black">{money(it.costCentsPerUnit)}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-[10px] text-black/40 font-mono">{it.sku ?? "—"}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button onClick={() => startEditItem(it)} className="flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-2.5 py-1.5 rounded-lg">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Editar
                      </button>
                      <button disabled={isBusy} onClick={() => void deleteItem(it.id)} className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg">
                        {isBusy ? (
                          <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                            <path d="M21 12a9 9 0 00-9-9"/>
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          </svg>
                        )}
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: MOVIMIENTOS ── */}
      {tab === "movements" && (
        <>
          {/* Formulario movimiento */}
          {showMovForm && (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black">Nuevo movimiento</p>
                  <p className="text-[10px] text-black/40 mt-0.5">Entrada o salida de stock para un producto</p>
                </div>
                <button onClick={() => setShowMovForm(false)} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={saveMovement} className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                  <div className="xl:col-span-2">
                    <label className={labelCls}>Producto *</label>
                    <select required value={movForm.itemId} onChange={(e) => setMovForm(p => ({ ...p, itemId: e.target.value }))} className={inputCls}>
                      <option value="">— Selecciona —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name} ({it.quantityOnHand} {it.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select value={movForm.direction} onChange={(e) => setMovForm(p => ({ ...p, direction: e.target.value as "IN" | "OUT" }))} className={inputCls}>
                      <option value="IN">Entrada (compra / ajuste +)</option>
                      <option value="OUT">Salida (venta / merma −)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Cantidad *</label>
                    <input type="number" min="1" required value={movForm.quantity} onChange={(e) => setMovForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha</label>
                    <input type="date" value={movForm.occurredAt} onChange={(e) => setMovForm(p => ({ ...p, occurredAt: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="xl:col-span-3">
                    <label className={labelCls}>Nota (opcional)</label>
                    <input type="text" value={movForm.note} onChange={(e) => setMovForm(p => ({ ...p, note: e.target.value }))} placeholder="Ej: Venta #123 / Compra proveedor X" className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowMovForm(false)} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">Cancelar</button>
                  <button type="submit" disabled={loading || items.length === 0} className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl">
                    {loading ? "Registrando..." : "Registrar movimiento"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista movimientos */}
          {movements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
              <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 014-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 01-4 4H3"/>
                </svg>
              </div>
              <p className="text-sm font-black text-black mb-1">Sin movimientos aún</p>
              <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Registra entradas y salidas para llevar control del stock.</p>
              <button onClick={() => setShowMovForm(true)} disabled={items.length === 0} className="bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-40 transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
                {items.length === 0 ? "Primero crea un producto" : "Registrar movimiento"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
                {[
                  { label: "Producto", col: "col-span-4" },
                  { label: "Tipo", col: "col-span-2" },
                  { label: "Cantidad", col: "col-span-2" },
                  { label: "Fecha", col: "col-span-2" },
                  { label: "Nota", col: "col-span-2" },
                ].map(({ label, col }) => (
                  <div key={label} className={col}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
                  </div>
                ))}
              </div>
              {movements.map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#F28705]">
                      {initials(m.item.name)}
                    </div>
                    <p className="text-xs font-black text-black truncate">{m.item.name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={[
                      "inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg",
                      m.direction === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
                    ].join(" ")}>
                      <div className={`w-1.5 h-1.5 rounded-full ${m.direction === "IN" ? "bg-emerald-500" : "bg-red-400"}`} />
                      {m.direction === "IN" ? "Entrada" : "Salida"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-sm font-black ${m.direction === "IN" ? "text-emerald-600" : "text-red-500"}`}>
                      {m.direction === "IN" ? "+" : "−"}{m.quantity}
                    </span>
                    <span className="text-xs text-black/40 ml-1">{m.item.unit}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-black/50 font-medium">{formatDate(m.occurredAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-black/45 truncate">{m.note ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}