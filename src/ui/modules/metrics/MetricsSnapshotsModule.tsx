"use client";

import * as React from "react";

type Snapshot = {
  id: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
  profitMarginBps: number | null;
  createdAt: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function dateToInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function MetricsSnapshotsModule() {
  const [items, setItems] = React.useState<Snapshot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");

  React.useEffect(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    setPeriodStart(dateToInputValue(start));
    setPeriodEnd(dateToInputValue(end));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics/snapshots", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar snapshots");
      setItems(data.snapshots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  async function onCompute(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo computar snapshot");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onRecompute(s: Snapshot) {
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/metrics/snapshots/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ periodStart: s.periodStart, periodEnd: s.periodEnd }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo recalcular snapshot");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/metrics/snapshots/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar snapshot");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  const latest = items[0] ?? null;

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
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
              Snapshots de métricas
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Métricas</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} snapshot{items.length !== 1 ? "s" : ""} calculado{items.length !== 1 ? "s" : ""}
              {latest ? ` · Último: ${formatDate(latest.createdAt)}` : ""}
            </p>
          </div>

          {/* Formulario inline */}
          <form
            onSubmit={onCompute}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="bg-transparent text-white text-xs font-medium outline-none w-28 [color-scheme:dark]"
              />
            </div>
            <span className="text-white/30 text-xs">→</span>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2">
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="bg-transparent text-white text-xs font-medium outline-none w-28 [color-scheme:dark]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !periodStart || !periodEnd}
              className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              {loading && !busyId ? (
                <>
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Calculando...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nuevo snapshot
                </>
              )}
            </button>
          </form>
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

      {/* ── LISTA ── */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin snapshots aún</p>
          <p className="text-xs text-black/40 max-w-xs mx-auto">
            Selecciona un rango de fechas y calcula tu primer snapshot de métricas.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">

          {/* Header tabla */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
            {["Período", "Ingresos", "Gastos", "Beneficio", "Margen", ""].map((h, i) => (
              <div
                key={i}
                className={[
                  i === 0 ? "col-span-3" :
                  i === 5 ? "col-span-2 text-right" :
                  "col-span-1",
                  i === 4 ? "col-span-2" : "",
                ].join(" ")}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{h}</p>
              </div>
            ))}
          </div>

          {/* Filas */}
          {items.map((s, idx) => {
            const isBusy = busyId === s.id;
            const isLatest = idx === 0;
            const profitPositive = s.profitCents >= 0;
            const marginPositive = (s.profitMarginBps ?? 0) >= 0;

            return (
              <div
                key={s.id}
                className={[
                  "grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center transition-colors hover:bg-[#F5F4F2]",
                  isLatest ? "bg-[#FFFBF5]" : "",
                ].join(" ")}
              >
                {/* Período */}
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className={[
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    isLatest ? "bg-[#F28705]" : "bg-[#F5F4F2]",
                  ].join(" ")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke={isLatest ? "white" : "rgba(0,0,0,0.4)"} strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-black leading-tight">
                      {formatDate(s.periodStart)}
                    </p>
                    <p className="text-[10px] text-black/40 mt-0.5">
                      → {formatDate(s.periodEnd)}
                    </p>
                  </div>
                  {isLatest && (
                    <span className="text-[9px] font-black text-[#F28705] bg-[#FFF3E0] px-2 py-0.5 rounded-full flex-shrink-0">
                      Último
                    </span>
                  )}
                </div>

                {/* Ingresos */}
                <div className="col-span-1">
                  <p className="text-xs font-bold text-black">{money(s.revenueCents)}</p>
                  <p className="text-[9px] text-black/30 mt-0.5">{s.currency}</p>
                </div>

                {/* Gastos */}
                <div className="col-span-1">
                  <p className="text-xs font-bold text-black">{money(s.expenseCents)}</p>
                  <p className="text-[9px] text-black/30 mt-0.5">{s.currency}</p>
                </div>

                {/* Beneficio */}
                <div className="col-span-1">
                  <p className={[
                    "text-xs font-black",
                    profitPositive ? "text-emerald-600" : "text-red-500",
                  ].join(" ")}>
                    {profitPositive ? "+" : ""}{money(s.profitCents)}
                  </p>
                  <p className="text-[9px] text-black/30 mt-0.5">{s.currency}</p>
                </div>

                {/* Margen */}
                <div className="col-span-2">
                  {s.profitMarginBps === null ? (
                    <span className="text-xs text-black/30">—</span>
                  ) : (
                    <span className={[
                      "inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg",
                      marginPositive
                        ? "bg-[#FFF3E0] text-[#F28705]"
                        : "bg-red-50 text-red-500",
                    ].join(" ")}>
                      {marginPositive ? "↑" : "↓"}
                      {(s.profitMarginBps / 100).toFixed(2)}%
                    </span>
                  )}
                </div>

                {/* Acciones */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <button
                    disabled={isBusy}
                    onClick={() => void onRecompute(s)}
                    className="flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg"
                    title="Recalcular con los mismos períodos"
                  >
                    {isBusy ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                        <path d="M21 12a9 9 0 00-9-9"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                      </svg>
                    )}
                    Recalcular
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => void onDelete(s.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg"
                    title="Eliminar snapshot"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}