"use client";

import * as React from "react";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTermsDays: number | null;
  createdAt: string;
  updatedAt: string;
};

type PurchaseOrderListRow = {
  id: string;
  status: string;
  orderNumber: string | null;
  currency: string;
  expectedDeliveryAt: string | null;
  receivedAt: string | null;
  supplier: { id: string; name: string };
  isPaid: boolean;
  paidAt: string | null;
  totalAmountCents: number;
  totalReceivedCents: number;
};

type Project = { id: string; name: string };

// ── helpers ──────────────────────────────────────────────
function money(cents: number) {
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

function orderStatusStyles(status: string) {
  switch (status) {
    case "RECEIVED":  return { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", label: "Recibida" };
    case "CANCELLED": return { badge: "bg-red-50 text-red-500",         dot: "bg-red-400",     label: "Cancelada" };
    case "PENDING":   return { badge: "bg-amber-50 text-amber-600",     dot: "bg-amber-500",   label: "Pendiente" };
    default:          return { badge: "bg-[#F5F4F2] text-black/50",     dot: "bg-black/20",    label: status };
  }
}

type TabKey = "purchaseOrders" | "suppliers";

// ── shared input styles ───────────────────────────────────
const inputCls = "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

export function PurchasesModule() {
  const [tab, setTab] = React.useState<TabKey>("purchaseOrders");

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [orders, setOrders] = React.useState<PurchaseOrderListRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSupForm, setShowSupForm] = React.useState(false);
  const [showPoForm, setShowPoForm] = React.useState(false);

  // Supplier form
  const [supName, setSupName] = React.useState("");
  const [supContactName, setSupContactName] = React.useState("");
  const [supEmail, setSupEmail] = React.useState("");
  const [supPhone, setSupPhone] = React.useState("");
  const [supPaymentTermsDays, setSupPaymentTermsDays] = React.useState("");

  // PO form
  const [poSupplierId, setPoSupplierId] = React.useState("");
  const [poCurrency, setPoCurrency] = React.useState("USD");
  const [poOrderNumber, setPoOrderNumber] = React.useState("");
  const [poExpectedDeliveryAt, setPoExpectedDeliveryAt] = React.useState("");
  const [poItems, setPoItems] = React.useState([
    { id: "item-1", description: "", quantity: 1, unitPrice: "" },
  ]);

  // Receive modal
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveOrderId, setReceiveOrderId] = React.useState<string | null>(null);
  const [receiveProjectId, setReceiveProjectId] = React.useState("");
  const [receiveReceivedAt, setReceiveReceivedAt] = React.useState("");
  const [receiveNote, setReceiveNote] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      await Promise.all([loadSuppliers(), loadProjects(), loadOrders()]);
    })().catch((e) => setError(e instanceof Error ? e.message : "Error de red"));
  }, []);

  async function loadSuppliers() {
    const res = await fetch("/api/suppliers", { credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar proveedores");
    setSuppliers(json?.suppliers ?? []);
  }

  async function loadProjects() {
    const res = await fetch("/api/projects", { credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar proyectos");
    setProjects((json?.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
  }

  async function loadOrders() {
    const res = await fetch("/api/purchase-orders", { credentials: "include" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar órdenes");
    setOrders(json?.orders ?? []);
  }

  async function createSupplier() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          name: supName, contactName: supContactName.trim() || null,
          email: supEmail.trim() || null, phone: supPhone.trim() || null,
          paymentTermsDays: supPaymentTermsDays.trim() ? Number(supPaymentTermsDays) : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear proveedor");
      setSupName(""); setSupContactName(""); setSupEmail(""); setSupPhone(""); setSupPaymentTermsDays("");
      setShowSupForm(false);
      await loadSuppliers();
    } catch (e) { setError(e instanceof Error ? e.message : "Error de red"); }
    finally { setLoading(false); }
  }

  async function createPurchaseOrder() {
    setLoading(true); setError(null);
    try {
      if (!poSupplierId) throw new Error("Selecciona un proveedor");
      const items = poItems.filter((it) => it.description.trim()).map((it) => ({
        description: it.description.trim(),
        quantity: Math.max(1, Math.round(it.quantity)),
        unitPrice: Number(it.unitPrice),
      }));
      if (items.length === 0) throw new Error("Agrega al menos un item con descripción");
      const res = await fetch("/api/purchase-orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          supplierId: poSupplierId, currency: poCurrency.trim().toUpperCase(),
          orderNumber: poOrderNumber.trim() || null,
          expectedDeliveryAt: poExpectedDeliveryAt ? new Date(poExpectedDeliveryAt).toISOString() : null,
          items,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear la orden");
      setPoOrderNumber(""); setPoExpectedDeliveryAt("");
      setPoItems([{ id: "item-1", description: "", quantity: 1, unitPrice: "" }]);
      setShowPoForm(false);
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Error de red"); }
    finally { setLoading(false); }
  }

  function openReceiveModal(orderId: string) {
    setReceiveOrderId(orderId); setReceiveProjectId(""); setReceiveNote("");
    setReceiveReceivedAt(new Date().toISOString()); setReceiveOpen(true);
  }

  async function receiveOrder() {
    if (!receiveOrderId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${receiveOrderId}/receive`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          receivedAt: receiveReceivedAt,
          note: receiveNote.trim() || null,
          projectId: receiveProjectId || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la recepción");
      setReceiveOpen(false); setReceiveOrderId(null);
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Error de red"); }
    finally { setLoading(false); }
  }

  const pendingOrders = orders.filter(o => o.status !== "RECEIVED" && o.status !== "CANCELLED");

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
              Proveedores y compras
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              {tab === "purchaseOrders" ? "Órdenes de compra" : "Proveedores"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {tab === "purchaseOrders"
                ? `${orders.length} orden${orders.length !== 1 ? "es" : ""} · ${pendingOrders.length} pendiente${pendingOrders.length !== 1 ? "s" : ""}`
                : `${suppliers.length} proveedor${suppliers.length !== 1 ? "es" : ""} registrado${suppliers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              {([["purchaseOrders", "Órdenes"], ["suppliers", "Proveedores"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    tab === key ? "bg-[#F28705] text-white" : "text-white/50 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* CTA */}
            <button
              onClick={() => tab === "purchaseOrders" ? setShowPoForm(true) : setShowSupForm(true)}
              className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {tab === "purchaseOrders" ? "Nueva orden" : "Nuevo proveedor"}
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

      {/* ── TAB: ÓRDENES ── */}
      {tab === "purchaseOrders" && (
        <>
          {/* Formulario nueva orden */}
          {showPoForm && (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black">Nueva orden de compra</p>
                  <p className="text-[10px] text-black/40 mt-0.5">Asigna proveedor, items y condiciones</p>
                </div>
                <button onClick={() => setShowPoForm(false)} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Proveedor *</label>
                    <select value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} className={inputCls}>
                      <option value="">— Selecciona —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Moneda (ISO)</label>
                    <input type="text" value={poCurrency} onChange={(e) => setPoCurrency(e.target.value)} placeholder="USD" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>N° orden (opcional)</label>
                    <input type="text" value={poOrderNumber} onChange={(e) => setPoOrderNumber(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Entrega esperada</label>
                    <input type="date" value={poExpectedDeliveryAt} onChange={(e) => setPoExpectedDeliveryAt(e.target.value)} className={inputCls} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className={labelCls}>Items</p>
                  <div className="space-y-3">
                    {poItems.map((it, idx) => (
                      <div key={it.id} className="border border-black/[0.06] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.1em]">Item {idx + 1}</p>
                          {poItems.length > 1 && (
                            <button
                              onClick={() => setPoItems((cur) => cur.filter((x) => x.id !== it.id))}
                              className="text-[10px] font-bold text-red-400 hover:text-red-600"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <input
                          type="text" value={it.description}
                          onChange={(e) => setPoItems((cur) => cur.map((x) => x.id === it.id ? { ...x, description: e.target.value } : x))}
                          placeholder="Descripción del item"
                          className={inputCls}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Cantidad</label>
                            <input type="number" value={it.quantity}
                              onChange={(e) => setPoItems((cur) => cur.map((x) => x.id === it.id ? { ...x, quantity: Number(e.target.value) } : x))}
                              className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Precio unitario</label>
                            <input type="text" value={it.unitPrice} placeholder="0.00"
                              onChange={(e) => setPoItems((cur) => cur.map((x) => x.id === it.id ? { ...x, unitPrice: e.target.value } : x))}
                              className={inputCls} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setPoItems((cur) => [...cur, { id: `item-${cur.length + 1}-${Date.now()}`, description: "", quantity: 1, unitPrice: "" }])}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#F28705] hover:text-[#F25C05] transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Agregar item
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowPoForm(false)} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">
                    Cancelar
                  </button>
                  <button
                    onClick={() => void createPurchaseOrder()}
                    disabled={loading || !poSupplierId || poItems.every((x) => !x.description.trim())}
                    className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                  >
                    {loading ? (
                      <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                        <path d="M21 12a9 9 0 00-9-9"/>
                      </svg>
                    ) : null}
                    {loading ? "Creando..." : "Crear orden"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista órdenes */}
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
              <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              <p className="text-sm font-black text-black mb-1">Sin órdenes de compra</p>
              <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Crea tu primera orden para gestionar compras a proveedores.</p>
              <button onClick={() => setShowPoForm(true)} className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
                Crear primera orden
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
                {[
                  { label: "Proveedor", col: "col-span-3" },
                  { label: "Estado", col: "col-span-2" },
                  { label: "N° orden", col: "col-span-2" },
                  { label: "Entrega", col: "col-span-2" },
                  { label: "Total", col: "col-span-2" },
                  { label: "", col: "col-span-1 text-right" },
                ].map(({ label, col }) => (
                  <div key={label} className={col}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
                  </div>
                ))}
              </div>
              {orders.map((o) => {
                const st = orderStatusStyles(o.status);
                return (
                  <div key={o.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#F28705]">
                        {initials(o.supplier.name)}
                      </div>
                      <p className="text-xs font-black text-black truncate">{o.supplier.name}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg ${st.badge}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-black/50">{o.orderNumber ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-black/50">
                        {o.receivedAt ? formatDate(o.receivedAt) : o.expectedDeliveryAt ? formatDate(o.expectedDeliveryAt) : "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-black text-black">{money(o.totalReceivedCents)}</p>
                      <p className="text-[10px] text-black/35">/ {money(o.totalAmountCents)} {o.currency}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                        <button
                          onClick={() => openReceiveModal(o.id)}
                          className="text-[10px] font-bold text-[#F28705] hover:text-[#F25C05] bg-[#FFF3E0] hover:bg-[#FFE0A0] transition-colors px-2.5 py-1.5 rounded-lg"
                        >
                          Recibir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: PROVEEDORES ── */}
      {tab === "suppliers" && (
        <>
          {showSupForm && (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black">Nuevo proveedor</p>
                  <p className="text-[10px] text-black/40 mt-0.5">Registra contacto y condiciones de pago</p>
                </div>
                <button onClick={() => setShowSupForm(false)} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
                  {[
                    { label: "Nombre *", value: supName, onChange: setSupName, placeholder: "Ej: Proveedor S.A.", type: "text" },
                    { label: "Contacto (opcional)", value: supContactName, onChange: setSupContactName, placeholder: "Juan García", type: "text" },
                    { label: "Email (opcional)", value: supEmail, onChange: setSupEmail, placeholder: "correo@proveedor.com", type: "email" },
                    { label: "Teléfono (opcional)", value: supPhone, onChange: setSupPhone, placeholder: "+57 300 000 0000", type: "tel" },
                    { label: "Términos de pago (días)", value: supPaymentTermsDays, onChange: setSupPaymentTermsDays, placeholder: "30", type: "number" },
                  ].map(({ label, value, onChange, placeholder, type }) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowSupForm(false)} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">Cancelar</button>
                  <button
                    onClick={() => void createSupplier()}
                    disabled={loading || supName.trim().length < 2}
                    className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                  >
                    {loading ? "Guardando..." : "Crear proveedor"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
              <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-black text-black mb-1">Sin proveedores aún</p>
              <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Registra proveedores para asociarlos a órdenes de compra.</p>
              <button onClick={() => setShowSupForm(true)} className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
                Crear primer proveedor
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
                {[
                  { label: "Proveedor", col: "col-span-4" },
                  { label: "Contacto", col: "col-span-3" },
                  { label: "Datos", col: "col-span-3" },
                  { label: "Pago (días)", col: "col-span-2 text-right" },
                ].map(({ label, col }) => (
                  <div key={label} className={col}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
                  </div>
                ))}
              </div>
              {suppliers.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#F28705]">
                      {initials(s.name)}
                    </div>
                    <p className="text-sm font-black text-black truncate">{s.name}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs font-bold text-black/60">{s.contactName ?? "—"}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    {s.email && <p className="text-[10px] text-black/50 truncate">{s.email}</p>}
                    {s.phone && <p className="text-[10px] text-black/40 truncate">{s.phone}</p>}
                    {!s.email && !s.phone && <span className="text-[10px] text-black/25">—</span>}
                  </div>
                  <div className="col-span-2 text-right">
                    {s.paymentTermsDays ? (
                      <span className="text-[10px] font-black text-[#F28705] bg-[#FFF3E0] px-2 py-1 rounded-lg">{s.paymentTermsDays}d</span>
                    ) : (
                      <span className="text-[10px] text-black/25">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL RECEPCIÓN ── */}
      {receiveOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-black/[0.06] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-black/[0.05] flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-black">Registrar recepción</p>
                <p className="text-[10px] text-black/40 mt-0.5">Marca la orden como recibida</p>
              </div>
              <button onClick={() => setReceiveOpen(false)} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Fecha de recepción</label>
                <input
                  type="datetime-local"
                  value={receiveReceivedAt ? new Date(receiveReceivedAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setReceiveReceivedAt(new Date(e.target.value).toISOString())}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Proyecto (opcional)</label>
                <select value={receiveProjectId} onChange={(e) => setReceiveProjectId(e.target.value)} className={inputCls}>
                  <option value="">— Sin proyecto —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nota (opcional)</label>
                <textarea
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  placeholder="Ej: Llegó parcial / documento adjunto..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setReceiveOpen(false)} disabled={loading} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={() => void receiveOrder()}
                  disabled={loading}
                  className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                >
                  {loading ? (
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                      <path d="M21 12a9 9 0 00-9-9"/>
                    </svg>
                  ) : null}
                  {loading ? "Registrando..." : "Confirmar recepción"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}