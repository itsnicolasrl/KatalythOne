"use client";

import * as React from "react";

type CustomerOption = { id: string; name: string };
type Revenue = {
  id: string;
  occurredAt: string;
  amountCents: number;
  currency: string;
  description: string | null;
  paymentMethod: string | null;
  reference: string | null;
  channel: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  customerId: string | null;
  customer: CustomerOption | null;
  createdAt: string;
};

const PAYMENT_OPTIONS = [
  { value: "", label: "Sin método" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "Sin canal" },
  { value: "MOSTRADOR", label: "Mostrador / local" },
  { value: "ONLINE", label: "Online" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "OTRO", label: "Otro" },
];

// ── helpers ──────────────────────────────────────────────
function money(cents: number) {
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function dateToInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function paymentLabel(p: string | null) {
  return PAYMENT_OPTIONS.find(o => o.value === p)?.label ?? "—";
}

function channelLabel(c: string | null) {
  return CHANNEL_OPTIONS.find(o => o.value === c)?.label ?? "—";
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("");
}

const inputCls = "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

export function RevenuesModule() {
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [items, setItems] = React.useState<Revenue[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state
  const [customerId, setCustomerId] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(() => dateToInputValue(new Date()));
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [description, setDescription] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [cRes, rRes] = await Promise.all([
        fetch("/api/customers", { credentials: "include" }),
        fetch("/api/revenues", { credentials: "include" }),
      ]);
      const cData = await cRes.json().catch(() => null);
      if (!cRes.ok) throw new Error(cData?.error ?? "No se pudieron cargar clientes");
      setCustomers((cData?.customers ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));

      const rData = await rRes.json().catch(() => null);
      if (!rRes.ok) throw new Error(rData?.error ?? "No se pudieron cargar ventas");
      setItems(rData.revenues ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void loadAll(); }, []);

  function resetForm() {
    setEditingId(null);
    setCustomerId(""); setAmount(""); setCurrency("USD");
    setDescription(""); setPaymentMethod(""); setReference("");
    setChannel(""); setQuantity(""); setUnitPrice("");
    setOccurredAt(dateToInputValue(new Date()));
    setShowForm(false);
  }

  function startEdit(r: Revenue) {
    setEditingId(r.id);
    setCustomerId(r.customerId ?? "");
    setOccurredAt(r.occurredAt.slice(0, 10));
    setAmount(money(r.amountCents).replace(/\./g, "").replace(",", "."));
    setCurrency(r.currency);
    setDescription(r.description ?? "");
    setPaymentMethod(r.paymentMethod ?? "");
    setReference(r.reference ?? "");
    setChannel(r.channel ?? "");
    setQuantity(r.quantity !== null ? String(r.quantity) : "");
    setUnitPrice(r.unitPriceCents !== null ? (r.unitPriceCents / 100).toFixed(2) : "");
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = {
        customerId: customerId || null, occurredAt,
        amount: Number(amount),
        currency: currency.trim().toUpperCase() || "USD",
        description: description.trim() || null,
        paymentMethod: paymentMethod || null,
        reference: reference.trim() || null,
        channel: channel || null,
        quantity: quantity.trim() === "" ? null : Number(quantity),
        unitPrice: unitPrice.trim() === "" ? null : Number(unitPrice),
      };
      const res = editingId
        ? await fetch(`/api/revenues/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
        : await fetch("/api/revenues", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      resetForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/revenues/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  // Stats
  const totalByCurrency = items.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + r.amountCents;
    return acc;
  }, {});

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
              Registro de ventas
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Ventas</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} venta{items.length !== 1 ? "s" : ""} registrada{items.length !== 1 ? "s" : ""}
              {Object.entries(totalByCurrency).map(([cur, cents]) => ` · ${money(cents)} ${cur}`).join("")}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva venta
          </button>
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

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total ventas", value: items.length, color: "text-black", bg: "bg-[#F5F4F2]" },
            { label: "Con cliente", value: items.filter(r => r.customerId).length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Efectivo", value: items.filter(r => r.paymentMethod === "EFECTIVO").length, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Online", value: items.filter(r => r.channel === "ONLINE").length, color: "text-[#F28705]", bg: "bg-[#FFF3E0]" },
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

      {/* ── FORMULARIO ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-black">{editingId ? "Editar venta" : "Nueva venta"}</p>
              <p className="text-[10px] text-black/40 mt-0.5">Registra el ingreso con todos los detalles relevantes</p>
            </div>
            <button onClick={resetForm} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form onSubmit={onSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              {/* Monto + moneda */}
              <div>
                <label className={labelCls}>Monto total *</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Moneda (ISO)</label>
                <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha</label>
                <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cliente (opcional)</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                  <option value="">Sin cliente</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Método + canal */}
              <div>
                <label className={labelCls}>Método de pago</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                  {PAYMENT_OPTIONS.map((o) => <option key={o.value || "e"} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Canal de venta</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                  {CHANNEL_OPTIONS.map((o) => <option key={o.value || "ec"} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Referencia / factura</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="FAC-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descripción (opcional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Concepto de la venta" className={inputCls} />
              </div>

              {/* Cantidad + precio unitario */}
              <div>
                <label className={labelCls}>Cantidad (opcional)</label>
                <input type="number" step="1" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ej: 3" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Precio unitario (opcional)</label>
                <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">Cancelar</button>
              <button type="submit" disabled={loading || !amount.trim()}
                className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl">
                {loading ? (
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                ) : null}
                {loading ? "Guardando..." : editingId ? "Actualizar venta" : "Crear venta"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LISTA ── */}
      {items.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin ventas registradas</p>
          <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Registra tus ingresos para generar métricas, alertas y diagnósticos.</p>
          <button onClick={() => setShowForm(true)} className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
            Crear primera venta
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
            {[
              { label: "Fecha", col: "col-span-2" },
              { label: "Cliente", col: "col-span-2" },
              { label: "Monto", col: "col-span-2" },
              { label: "Pago / Canal", col: "col-span-2" },
              { label: "Referencia", col: "col-span-1" },
              { label: "Detalle", col: "col-span-2" },
              { label: "", col: "col-span-1 text-right" },
            ].map(({ label, col }) => (
              <div key={label} className={col}>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Filas */}
          {items.map((r) => {
            const isBusy = busyId === r.id;
            return (
              <div key={r.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                {/* Fecha */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-black">{formatDate(r.occurredAt)}</p>
                </div>

                {/* Cliente */}
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  {r.customer ? (
                    <>
                      <div className="w-6 h-6 rounded-md bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-[9px] font-black text-[#F28705]">
                        {initials(r.customer.name)}
                      </div>
                      <p className="text-xs font-bold text-black truncate">{r.customer.name}</p>
                    </>
                  ) : (
                    <span className="text-xs text-black/30">—</span>
                  )}
                </div>

                {/* Monto */}
                <div className="col-span-2">
                  <p className="text-sm font-black text-black">{money(r.amountCents)}</p>
                  <p className="text-[10px] text-black/35">{r.currency}</p>
                </div>

                {/* Pago + Canal */}
                <div className="col-span-2 space-y-1">
                  {r.paymentMethod && (
                    <span className="inline-block text-[9px] font-black bg-[#F5F4F2] text-black/60 px-2 py-0.5 rounded-md">
                      {paymentLabel(r.paymentMethod)}
                    </span>
                  )}
                  {r.channel && (
                    <span className="inline-block text-[9px] font-black bg-[#FFF3E0] text-[#F28705] px-2 py-0.5 rounded-md ml-1">
                      {channelLabel(r.channel)}
                    </span>
                  )}
                  {!r.paymentMethod && !r.channel && <span className="text-xs text-black/25">—</span>}
                </div>

                {/* Referencia */}
                <div className="col-span-1">
                  <p className="text-[10px] text-black/50 font-mono truncate">{r.reference ?? "—"}</p>
                </div>

                {/* Detalle (descripción + cantidad) */}
                <div className="col-span-2 min-w-0">
                  {r.description && <p className="text-[10px] text-black/55 truncate">{r.description}</p>}
                  {r.quantity !== null && (
                    <p className="text-[10px] text-black/40">
                      {r.quantity} ud{r.unitPriceCents !== null ? ` @ ${money(r.unitPriceCents)}` : ""}
                    </p>
                  )}
                  {!r.description && r.quantity === null && <span className="text-[10px] text-black/25">—</span>}
                </div>

                {/* Acciones */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button onClick={() => startEdit(r)}
                    className="w-6 h-6 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
                    title="Editar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button disabled={isBusy} onClick={() => void onDelete(r.id)}
                    className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Eliminar">
                    {isBusy ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                        <path d="M21 12a9 9 0 00-9-9"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {loading && items.length > 0 && (
            <div className="px-5 py-3 flex items-center gap-2 text-xs text-black/40">
              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
              Actualizando...
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}