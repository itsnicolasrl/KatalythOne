"use client";

import * as React from "react";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Textarea } from "@/src/ui/components/Textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/ui/components/Table";

type Member = { userId: string; email: string; fullName: string | null; role: string };

type TimeEntry = {
  id: string;
  userId: string;
  minutes: number;
  occurredAt: string | Date;
  description: string | null;
  createdAt: string | Date;
  userEmail: string;
  userFullName: string | null;
};

type FinancialRow = {
  currency: string;
  actualRevenueCents: number;
  actualExpenseCents: number;
  actualProfitCents: number;
};

type Summary = {
  project: {
    id: string;
    name: string;
    status: string;
    budgetCurrency: string | null;
    estimatedCostCents: number | null;
    estimatedRevenueCents: number | null;
  };
  members: Member[];
  totals: { timeMinutes: number; financialByCurrency: FinancialRow[] };
  timeEntries: TimeEntry[];
};

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function minutesToHours(min: number) {
  return min / 60;
}

function toInputDateTimeLocal(d: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function ProjectExecutionModule({ projectId }: { projectId: string }) {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [userId, setUserId] = React.useState<string>("");
  const [hours, setHours] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [occurredAt, setOccurredAt] = React.useState<string>(() => toInputDateTimeLocal(new Date()));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/summary`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el resumen del proyecto");
      const s = json?.summary as Summary | null;
      setSummary(s);
      if (s?.members?.length) setUserId((prev) => prev || s.members[0].userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createTimeEntry() {
    if (!summary) return;
    setLoading(true);
    setError(null);
    try {
      const h = Number(hours);
      if (!Number.isFinite(h) || h <= 0) throw new Error("Horas inválidas");

      const res = await fetch(`/api/projects/${projectId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: userId,
          hours: h,
          description: description.trim() ? description.trim() : null,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la hora");

      setHours("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold">Ejecución del proyecto</h3>
              <p className="text-sm text-foreground/70 mt-1">
                Horas por persona + rentabilidad por costos/ingresos imputados.
              </p>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Actualizar
            </Button>
          </div>

          {!summary ? (
            <p className="text-sm text-foreground/70">Cargando...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#F5F4F2] rounded-2xl p-4">
                  <p className="text-xs font-bold text-black/40">Horas registradas</p>
                  <p className="text-xl font-black">{minutesToHours(summary.totals.timeMinutes).toFixed(1)}</p>
                </div>
                <div className="bg-[#F5F4F2] rounded-2xl p-4">
                  <p className="text-xs font-bold text-black/40">Presupuesto (costo)</p>
                  <p className="text-xl font-black">
                    {summary.project.estimatedCostCents == null ? "—" : `${moneyFromCents(summary.project.estimatedCostCents)} ${summary.project.budgetCurrency ?? ""}`.trim()}
                  </p>
                </div>
                <div className="bg-[#F5F4F2] rounded-2xl p-4">
                  <p className="text-xs font-bold text-black/40">Presupuesto (ingreso)</p>
                  <p className="text-xl font-black">
                    {summary.project.estimatedRevenueCents == null ? "—" : `${moneyFromCents(summary.project.estimatedRevenueCents)} ${summary.project.budgetCurrency ?? ""}`.trim()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wide text-foreground/60">Rentabilidad real</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Ingresos</TableHead>
                        <TableHead>Costos</TableHead>
                        <TableHead>Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.totals.financialByCurrency.length === 0 ? (
                        <TableRow>
                          <TableCell className="text-sm text-foreground/70">Sin datos financieros imputados a este proyecto.</TableCell>
                          <TableCell> </TableCell>
                          <TableCell> </TableCell>
                          <TableCell> </TableCell>
                        </TableRow>
                      ) : (
                        summary.totals.financialByCurrency.map((r) => (
                          <TableRow key={r.currency}>
                            <TableCell className="font-semibold">{r.currency}</TableCell>
                            <TableCell>{moneyFromCents(r.actualRevenueCents)}</TableCell>
                            <TableCell>{moneyFromCents(r.actualExpenseCents)}</TableCell>
                            <TableCell className={r.actualProfitCents >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {moneyFromCents(r.actualProfitCents)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wide text-foreground/60">Registrar horas</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-2 text-foreground/70">Persona</label>
                      <select
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full rounded-xl border border-foreground/15 bg-background px-4 py-3"
                      >
                        {summary.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.fullName ? `${m.fullName}` : m.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input label="Horas (ej: 1.5)" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ej: 2.0" type="number" />
                    <Input
                      label="Fecha"
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                    />
                    <Textarea label="Detalle (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Reunión, revisión, desarrollo..." />

                    <div className="flex justify-end">
                      <Button variant="primary" onClick={() => void createTimeEntry()} disabled={loading || !userId || Number(hours) <= 0}>
                        {loading ? "Guardando..." : "Registrar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wide text-foreground/60">Últimas horas</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.timeEntries.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-sm text-foreground/70">Aún no hay horas registradas.</TableCell>
                        <TableCell> </TableCell>
                        <TableCell> </TableCell>
                        <TableCell> </TableCell>
                      </TableRow>
                    ) : (
                      summary.timeEntries.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold">
                            {t.userFullName ? t.userFullName : t.userEmail}
                          </TableCell>
                          <TableCell>{minutesToHours(t.minutes).toFixed(1)}</TableCell>
                          <TableCell>
                            {new Date(t.occurredAt).toLocaleString("es-CO", { dateStyle: "medium" })}
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">{t.description ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

