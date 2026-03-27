"use client";

import * as React from "react";

type Expense = {
  id: string;
  occurredAt: string;
  amountCents: number;
  currency: string;
  description: string | null;
  category: string | null;
  vendor: string | null;
  paymentMethod: string | null;
  isRecurring: boolean;
  createdAt: string;
};

const EXPENSE_CATEGORIES = [
  { value: "", label: "Sin categoría" },
  { value: "NOMINA", label: "Nómina / personal" },
  { value: "ALQUILER", label: "Alquiler / local" },
  { value: "SERVICIOS", label: "Servicios públicos" },
  { value: "INSUMOS", label: "Insumos / materiales" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TECNOLOGIA", label: "Tecnología / software" },
  { value: "LOGISTICA", label: "Logística / envíos" },
  { value: "IMPUESTOS", label: "Impuestos / tasas" },
  { value: "FINANCIERO", label: "Intereses / comisiones" },
  { value: "OTRO", label: "Otro" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Sin método" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
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

function categoryLabel(cat: string | null) {
  return EXPENSE_CATEGORIES.find(o => o.value === cat)?.label ?? cat ?? "—";
}

function paymentLabel(p: string | null) {
  return PAYMENT_OPTIONS.find(o => o.value === p)?.label ?? "—";
}

function categoryColor(cat: string | null) {
  switch (cat) {
    case "NOMINA":     return "bg-blue-50 text-blue-600";
    case "ALQUILER":   return "bg-purple-50 text-purple-600";
    case "SERVICIOS":  return "bg-amber-50 text-amber-600";
    case "INSUMOS":    return "bg-emerald-50 text-emerald-600";
    case "MARKETING":  return "bg-pink-50 text-pink-600";
    case "TECNOLOGIA": return "bg-cyan-50 text-cyan-600";
    case "LOGISTICA":  return "bg-orange-50 text-orange-600";
    case "IMPUESTOS":  return "bg-red-50 text-red-600";
    case "FINANCIERO": return "bg-rose-50 text-rose-600";
    default:           return "bg-[#F5F4F2] text-black/50";
  }
}

const inputCls = "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

export function ExpensesModule() {
  const [items, setItems] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form fields
  const [occurredAt, setOccurredAt] = React.useState(() => dateToInputValue(new Date()));
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [isRecurring, setIsRecurring] = React.useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/expenses", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar gastos");
      setItems(data.expenses ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null);
    setAmount(""); setCurrency("USD"); setDescription("");
    setCategory(""); setVendor(""); setPaymentMethod(""); setIsRecurring(false);
    setOccurredAt(dateToInputValue(new Date()));
    setShowForm(false);
  }

  function startEdit(x: Expense) {
    setEditingId(x.id);
    setOccurredAt(x.occurredAt.slice(0, 10));
    setAmount((x.amountCents / 100).toFixed(2));
    setCurrency(x.currency);
    setDescription(x.description ?? "");
    setCategory(x.category ?? "");
    setVendor(x.vendor ?? "");
    setPaymentMethod(x.paymentMethod ?? "");
    setIsRecurring(Boolean(x.isRecurring));
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = {
        occurredAt, amount: Number(amount),
        currency: currency.trim().toUpperCase() || "USD",
        description: description.trim() || null,
        category: category || null,
        vendor: vendor.trim() || null,
        paymentMethod: paymentMethod || null,
        isRecurring,
      };
      const res = editingId
        ? await fetch(`/api/expenses/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
        : await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  // Stats
  const totalByCurrency = items.reduce<Record<string, number>>((acc, x) => {
    acc[x.currency] = (acc[x.currency] ?? 0) + x.amountCents;
    return acc;
  }, {});
  const recurringCount = items.filter(x => x.isRecurring).length;

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
              Registro de gastos
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Gastos</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} gasto{items.length !== 1 ? "s" : ""}
              {Object.entries(totalByCurrency).map(([cur, cents]) => ` · ${money(cents)} ${cur}`).join("")}
              {recurringCount > 0 ? ` · ${recurringCount} recurrente${recurringCount !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo gasto
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
            { label: "Total gastos", value: items.length, color: "text-black", bg: "bg-[#F5F4F2]" },
            { label: "Recurrentes", value: recurringCount, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Nómina", value: items.filter(x => x.category === "NOMINA").length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Insumos", value: items.filter(x => x.category === "INSUMOS").length, color: "text-emerald-600", bg: "bg-emerald-50" },
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
              <p className="text-sm font-black text-black">{editingId ? "Editar gasto" : "Nuevo gasto"}</p>
              <p className="text-[10px] text-black/40 mt-0.5">Registra el gasto con categoría, proveedor y método de pago</p>
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
                <label className={labelCls}>Monto *</label>
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
                <label className={labelCls}>Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  {EXPENSE_CATEGORIES.map(o => <option key={o.value || "ec"} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Proveedor (opcional)</label>
                <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nombre o razón social" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Método de pago</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                  {PAYMENT_OPTIONS.map(o => <option key={o.value || "ep"} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="xl:col-span-2">
                <label className={labelCls}>Descripción (opcional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle del gasto" className={inputCls} />
              </div>

              {/* Recurrente */}
              <div className="xl:col-span-4">
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <div
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={[
                      "w-10 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer",
                      isRecurring ? "bg-[#F28705]" : "bg-black/15",
                    ].join(" ")}
                  >
                    <div className={[
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                      isRecurring ? "translate-x-5" : "translate-x-0.5",
                    ].join(" ")} />
                  </div>
                  <span className="text-xs font-bold text-black/70">Gasto recurrente (mensual / fijo)</span>
                </label>
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
                {loading ? "Guardando..." : editingId ? "Actualizar gasto" : "Crear gasto"}
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
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin gastos registrados</p>
          <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">Registra tus costos y gastos para calcular el margen real del negocio.</p>
          <button onClick={() => setShowForm(true)} className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
            Crear primer gasto
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
            {[
              { label: "Fecha", col: "col-span-2" },
              { label: "Monto", col: "col-span-2" },
              { label: "Categoría", col: "col-span-2" },
              { label: "Proveedor", col: "col-span-2" },
              { label: "Pago", col: "col-span-1" },
              { label: "Descripción", col: "col-span-2" },
              { label: "", col: "col-span-1 text-right" },
            ].map(({ label, col }) => (
              <div key={label} className={col}>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Filas */}
          {items.map((x) => {
            const isBusy = busyId === x.id;
            return (
              <div key={x.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                {/* Fecha */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-black">{formatDate(x.occurredAt)}</p>
                  {x.isRecurring && (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Recurrente</span>
                  )}
                </div>

                {/* Monto */}
                <div className="col-span-2">
                  <p className="text-sm font-black text-black">{money(x.amountCents)}</p>
                  <p className="text-[10px] text-black/35">{x.currency}</p>
                </div>

                {/* Categoría */}
                <div className="col-span-2">
                  {x.category ? (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${categoryColor(x.category)}`}>
                      {categoryLabel(x.category)}
                    </span>
                  ) : (
                    <span className="text-xs text-black/25">—</span>
                  )}
                </div>

                {/* Proveedor */}
                <div className="col-span-2 min-w-0">
                  <p className="text-xs text-black/60 font-medium truncate">{x.vendor ?? "—"}</p>
                </div>

                {/* Método pago */}
                <div className="col-span-1">
                  {x.paymentMethod ? (
                    <span className="text-[9px] font-black bg-[#F5F4F2] text-black/55 px-2 py-1 rounded-lg">
                      {paymentLabel(x.paymentMethod)}
                    </span>
                  ) : (
                    <span className="text-xs text-black/25">—</span>
                  )}
                </div>

                {/* Descripción */}
                <div className="col-span-2 min-w-0">
                  <p className="text-[10px] text-black/50 truncate">{x.description ?? "—"}</p>
                </div>

                {/* Acciones */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button onClick={() => startEdit(x)}
                    className="w-6 h-6 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
                    title="Editar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button disabled={isBusy} onClick={() => void onDelete(x.id)}
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