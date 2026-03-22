"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/ui/components/Table";
import type { CustomerForm, CustomerProfile } from "@/src/ui/modules/customers/customerProfileForm";
import {
  customerFormToPayload,
  customerProfileToForm,
  emptyCustomerForm,
} from "@/src/ui/modules/customers/customerProfileForm";
import { CustomerProfileFormFields } from "@/src/ui/modules/customers/CustomerProfileFormFields";

type ValueByCurrency = {
  currency: string;
  totalAmountCents: number;
  revenueCount: number;
  lastOccurredAt: string | null;
};

type CustomerValueApi = {
  value: {
    customerId: string;
    totalsByCurrency: ValueByCurrency[];
  };
  error?: string;
};

type HistoryItem = {
  id: string;
  occurredAt: string;
  amountCents: number;
  currency: string;
  description: string | null;
  createdAt: string;
};

type CustomerHistoryApi = {
  history: HistoryItem[];
  error?: string;
};

type CustomerGetApi = {
  customer: CustomerProfile & { companyId?: string };
  error?: string;
};

export function CustomerDetailModule({ customerId }: { customerId: string }) {
  const [profile, setProfile] = React.useState<(CustomerProfile & { companyId?: string }) | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(emptyCustomerForm());
  const [value, setValue] = React.useState<CustomerValueApi["value"] | null>(null);
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profileSavedMsg, setProfileSavedMsg] = React.useState<string | null>(null);

  const setField = React.useCallback(<K extends keyof CustomerForm>(key: K, v: CustomerForm[K]) => {
    setForm((f) => ({ ...f, [key]: v }));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    setProfileSavedMsg(null);
    try {
      const [cRes, vRes, hRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`, { credentials: "include" }),
        fetch(`/api/customers/${customerId}/value`, { credentials: "include" }),
        fetch(`/api/customers/${customerId}/history`, { credentials: "include" }),
      ]);

      const cJson = (await cRes.json().catch(() => null)) as CustomerGetApi | null;
      if (!cRes.ok) throw new Error(cJson?.error ?? "No se pudo cargar el cliente");
      const cust = cJson!.customer;
      setProfile(cust);
      setForm(customerProfileToForm(cust));

      const vJson = (await vRes.json().catch(() => null)) as CustomerValueApi | null;
      if (!vRes.ok) throw new Error(vJson?.error ?? "No se pudo cargar el valor del cliente");
      setValue(vJson!.value);

      const hJson = (await hRes.json().catch(() => null)) as CustomerHistoryApi | null;
      if (!hRes.ok) throw new Error(hJson?.error ?? "No se pudo cargar el historial");
      setHistory(hJson!.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileSavedMsg(null);
    try {
      const payload = customerFormToPayload(form);
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { customer?: CustomerProfile; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar la ficha");
      if (data?.customer) {
        setProfile(data.customer);
        setForm(customerProfileToForm(data.customer));
      }
      setProfileSavedMsg("Ficha actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">{profile?.name ?? "Cliente"}</h2>
          <p className="mt-1 text-sm text-foreground/70">Ficha completa, valor agregado e historial de ventas.</p>
        </div>
        <Link href="/dashboard/customers">
          <span className="text-sm font-extrabold text-primary">Volver</span>
        </Link>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      ) : null}

      {profileSavedMsg ? (
        <p className="text-sm font-semibold text-emerald-800 bg-emerald-600/10 border border-emerald-600/30 px-3 py-2 rounded-xl">
          {profileSavedMsg}
        </p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {loading && !profile ? (
            <p className="text-sm text-foreground/70">Cargando ficha...</p>
          ) : profile ? (
            <form onSubmit={onSaveProfile} className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-extrabold">Ficha del cliente</h3>
                  <p className="mt-1 text-sm text-foreground/70">
                    Persona o empresa, datos fiscales, ubicación y notas internas.
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    form.kind === "COMPANY" ? "bg-violet-100 text-violet-800" : "bg-muted text-foreground/80"
                  }`}
                >
                  {form.kind === "COMPANY" ? "Empresa" : "Persona"}
                </span>
              </div>
              <CustomerProfileFormFields form={form} setField={setField} />
              <div className="flex justify-end pt-2 border-t border-foreground/10">
                <button
                  type="submit"
                  disabled={savingProfile || !form.name.trim()}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
                >
                  {savingProfile ? "Guardando…" : "Guardar ficha"}
                </button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading && !value ? (
            <p className="text-sm text-foreground/70">Cargando valor...</p>
          ) : value ? (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold">Valor por moneda</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {value.totalsByCurrency.length === 0 ? (
                  <p className="text-sm text-foreground/70">Este cliente no tiene ventas registradas.</p>
                ) : (
                  value.totalsByCurrency.map((row) => (
                    <div key={row.currency} className="rounded-2xl border border-foreground/10 bg-background p-4">
                      <p className="text-sm font-extrabold">{row.currency}</p>
                      <p className="mt-2 text-2xl font-extrabold">{(row.totalAmountCents / 100).toFixed(2)}</p>
                      <p className="mt-1 text-sm text-foreground/70">Ventas: {row.revenueCount}</p>
                      <p className="mt-1 text-sm text-foreground/70">
                        Última compra: {row.lastOccurredAt ? new Date(row.lastOccurredAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold">Historial de ventas</h3>
              <p className="mt-1 text-sm text-foreground/70">Últimas transacciones registradas.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="mt-4 text-sm text-foreground/70">Sin historial para este cliente.</p>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.occurredAt).toLocaleDateString()}</TableCell>
                    <TableCell>{(h.amountCents / 100).toFixed(2)}</TableCell>
                    <TableCell>{h.currency}</TableCell>
                    <TableCell>{h.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
