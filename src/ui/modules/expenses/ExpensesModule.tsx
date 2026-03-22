"use client";

import * as React from "react";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/ui/components/Table";

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
  { value: "", label: "— Categoría —" },
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
  { value: "", label: "— Pago —" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function dateToInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ExpensesModule() {
  const [items, setItems] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [occurredAt, setOccurredAt] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("USD");
  const [description, setDescription] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("");
  const [vendor, setVendor] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("");
  const [isRecurring, setIsRecurring] = React.useState(false);

  React.useEffect(() => {
    setOccurredAt(dateToInputValue(new Date()));
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
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

  React.useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setCurrency("USD");
    setDescription("");
    setCategory("");
    setVendor("");
    setPaymentMethod("");
    setIsRecurring(false);
    setOccurredAt(dateToInputValue(new Date()));
  }

  function startEdit(x: Expense) {
    setEditingId(x.id);
    setOccurredAt(new Date(x.occurredAt).toISOString().slice(0, 10));
    setAmount(moneyFromCents(x.amountCents));
    setCurrency(x.currency);
    setDescription(x.description ?? "");
    setCategory(x.category ?? "");
    setVendor(x.vendor ?? "");
    setPaymentMethod(x.paymentMethod ?? "");
    setIsRecurring(Boolean(x.isRecurring));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        occurredAt,
        amount: Number(amount),
        currency: currency.trim().toUpperCase() || "USD",
        description: description ? description : null,
        category: category || null,
        vendor: vendor.trim() || null,
        paymentMethod: paymentMethod || null,
        isRecurring,
      };

      const res = editingId
        ? await fetch(`/api/expenses/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          })
        : await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar gasto");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold">Gastos</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Registra gastos con categoría, proveedor, método de pago y si es un costo recurrente.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <Input label="Fecha" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            <Input label="Moneda (ISO)" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            <Input label="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} required />

            <div className="w-full">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3"
              >
                {EXPENSE_CATEGORIES.map((o) => (
                  <option key={o.value || "ec"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Proveedor / beneficiario (opcional)"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Nombre o razón social"
            />
            <div className="w-full">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3"
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value || "ep"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 md:col-span-2 lg:col-span-1 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-foreground/20"
              />
              <span className="text-sm font-semibold text-foreground/90">Gasto recurrente (mensual / fijo)</span>
            </label>

            <div className="md:col-span-2 lg:col-span-3">
              <Input
                label="Descripción / detalle (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edición
                </Button>
              ) : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          {items.length === 0 ? (
            <p className="text-sm text-foreground/70">Aún no hay gastos. Crea el primero.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Rec.</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>{new Date(x.occurredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {moneyFromCents(x.amountCents)} {x.currency}
                    </TableCell>
                    <TableCell>{x.category ?? "—"}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{x.vendor ?? "—"}</TableCell>
                    <TableCell>{x.paymentMethod ?? "—"}</TableCell>
                    <TableCell>{x.isRecurring ? "Sí" : "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{x.description ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => startEdit(x)}>
                          Editar
                        </Button>
                        <Button variant="ghost" onClick={() => void onDelete(x.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {loading && items.length > 0 ? <p className="mt-3 text-sm text-foreground/70">Actualizando...</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

