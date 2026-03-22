"use client";

import * as React from "react";
import Link from "next/link";

import type { CustomerKind, CustomerForm } from "@/src/ui/modules/customers/customerProfileForm";
import {
  customerFormToPayload,
  customerProfileToForm,
  emptyCustomerForm,
} from "@/src/ui/modules/customers/customerProfileForm";
import { CustomerProfileFormFields } from "@/src/ui/modules/customers/CustomerProfileFormFields";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  kind: CustomerKind;
  documentId: string | null;
  legalName: string | null;
  taxId: string | null;
  industry: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  contactRole: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  createdAt: string | Date;
  value: Array<{ currency: string; totalCents: number }>;
  lastPurchaseAt: Date | string | null;
};

function initials(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function formatValue(value: Customer["value"]) {
  if (value.length === 0) return null;
  if (value.length === 1)
    return `${(value[0].totalCents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${value[0].currency}`;
  return "Multi-moneda";
}

export function CustomersModule() {
  const [items, setItems] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(emptyCustomerForm());

  const setField = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar clientes");
      setItems(data.customers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyCustomerForm());
    setShowForm(false);
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setForm(customerProfileToForm(c));
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = customerFormToPayload(form);
      const res = editingId
        ? await fetch(`/api/customers/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          })
        : await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
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
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  const topCustomer = items.reduce<Customer | null>((top, c) => {
    const val = c.value[0]?.totalCents ?? 0;
    const topVal = top?.value[0]?.totalCents ?? 0;
    return val > topVal ? c : top;
  }, null);

  const companyCount = items.filter((c) => c.kind === "COMPANY").length;

  return (
    <div className="space-y-4">
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-5 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right,rgba(242,135,5,0.2) 0%,transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Gestión de clientes
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Clientes</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} cliente{items.length !== 1 ? "s" : ""} registrado{items.length !== 1 ? "s" : ""}
              {topCustomer ? ` · Top: ${topCustomer.name}` : ""}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setForm(emptyCustomerForm());
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total clientes", value: items.length, color: "text-black", bg: "bg-[#F5F4F2]" },
            { label: "Empresas (B2B)", value: companyCount, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Con compras", value: items.filter((c) => c.value.some((v) => v.totalCents > 0)).length, color: "text-emerald-600", bg: "bg-emerald-50" },
            {
              label: "Activos (30d)",
              value: items.filter(
                (c) => c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() < 30 * 24 * 60 * 60 * 1000,
              ).length,
              color: "text-[#F28705]",
              bg: "bg-[#FFF3E0]",
            },
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-black">{editingId ? "Editar cliente" : "Nuevo cliente"}</p>
              <p className="text-[10px] text-black/40 mt-0.5">
                Ficha ampliada: persona o empresa, datos fiscales, ubicación y notas.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form onSubmit={onSubmit} className="p-5 space-y-6">
            <CustomerProfileFormFields form={form} setField={setField} />

            <div className="flex items-center gap-2 justify-end pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-4 py-2.5 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                    Guardando...
                  </>
                ) : editingId ? (
                  "Actualizar"
                ) : (
                  "Crear cliente"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin clientes aún</p>
          <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">
            Registra clientes con ficha completa: empresa, fiscal, ubicación y notas.
          </p>
          <button
            onClick={() => {
              setForm(emptyCustomerForm());
              setShowForm(true);
            }}
            className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full"
          >
            Crear primer cliente
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
            {[
              { label: "Cliente", col: "col-span-3" },
              { label: "Contacto / fiscal", col: "col-span-3" },
              { label: "Valor total", col: "col-span-2" },
              { label: "Última compra", col: "col-span-2" },
              { label: "", col: "col-span-2 text-right" },
            ].map(({ label, col }) => (
              <div key={label || "actions"} className={col}>
                {label ? <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p> : null}
              </div>
            ))}
          </div>

          {items.map((c) => {
            const isBusy = busyId === c.id;
            const val = formatValue(c.value);
            return (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#F28705]">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-black truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          c.kind === "COMPANY" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.kind === "COMPANY" ? "Empresa" : "Persona"}
                      </span>
                      {c.legalName ? (
                        <span className="text-[9px] text-black/40 truncate max-w-[140px]" title={c.legalName}>
                          {c.legalName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 min-w-0">
                  {c.email ? <p className="text-[10px] text-black/55 truncate">{c.email}</p> : null}
                  {c.phone ? <p className="text-[10px] text-black/40 truncate mt-0.5">{c.phone}</p> : null}
                  {c.taxId ? (
                    <p className="text-[9px] text-black/35 mt-0.5 font-mono truncate" title={c.taxId}>
                      ID fiscal: {c.taxId}
                    </p>
                  ) : null}
                  {!c.email && !c.phone && !c.taxId && <span className="text-[10px] text-black/25">—</span>}
                </div>

                <div className="col-span-2">
                  {val ? <p className="text-xs font-black text-black">{val}</p> : <span className="text-xs text-black/25">—</span>}
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-black/50 font-medium">{c.lastPurchaseAt ? formatDate(c.lastPurchaseAt) : "—"}</p>
                  <p className="text-[9px] text-black/30 mt-0.5">Alta {formatDate(c.createdAt)}</p>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-2.5 py-1.5 rounded-lg"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar
                  </button>
                  <Link
                    href={`/dashboard/customers/${c.id}`}
                    className="flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-2.5 py-1.5 rounded-lg"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver
                  </Link>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void onDelete(c.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg"
                  >
                    {isBusy ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                        <path d="M21 12a9 9 0 00-9-9" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    )}
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}

          {loading && items.length > 0 && (
            <div className="px-5 py-3 flex items-center gap-2 text-xs text-black/40">
              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                <path d="M21 12a9 9 0 00-9-9" />
              </svg>
              Actualizando...
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
