"use client";

import * as React from "react";
import { NetCashflowChart, MarginChart } from "@/src/ui/components/charts/CashflowCharts";

// ── types ────────────────────────────────────────────────
type Summary = {
  currency: string;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  marginBps: number | null;
};

type SeriesPoint = {
  bucket: string;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  marginBps: number | null;
};

type CashflowApi = {
  startDate: string;
  endDate: string;
  summaryByCurrency: Summary[];
  seriesByCurrency: Record<string, SeriesPoint[]>;
};

// ── helpers ──────────────────────────────────────────────
function money(cents: number) {
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function dateToInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBucketDisplay(bucket: string) {
  const parts = bucket.slice(0, 10).split("-");
  if (parts.length >= 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
  return bucket;
}

// ── component ────────────────────────────────────────────
export function CashflowModule() {
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [data, setData] = React.useState<CashflowApi | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<string>("");

  React.useEffect(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    setPeriodStart(dateToInputValue(start));
    setPeriodEnd(dateToInputValue(end));
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/cashflow?start=${encodeURIComponent(periodStart)}&end=${encodeURIComponent(periodEnd)}&bucket=day`,
        { credentials: "include" },
      );
      const json = (await res.json().catch(() => null)) as CashflowApi | { error?: string } | null;
      if (!res.ok) {
        const maybe = json as { error?: string } | null;
        throw new Error(maybe?.error ?? "No se pudo calcular flujo de caja");
      }
      const cast = json as CashflowApi;
      setData(cast);
      setCurrency(cast.summaryByCurrency[0]?.currency ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!periodStart || !periodEnd) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  const selectedSummary = data
    ? (data.summaryByCurrency.find((s) => s.currency === currency) ?? data.summaryByCurrency[0] ?? null)
    : null;

  const series = data && currency ? (data.seriesByCurrency[currency] ?? []) : [];
  const recentSeries = series.slice(-14).reverse();

  const netPositive = (selectedSummary?.netCents ?? 0) >= 0;
  const marginValue = selectedSummary?.marginBps !== null && selectedSummary?.marginBps !== undefined
    ? (selectedSummary.marginBps / 100).toFixed(2) + "%"
    : "—";

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
              Análisis financiero
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              Flujo de caja y margen
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Cálculo directo desde ventas y gastos registrados
            </p>
          </div>

          {/* Filtros inline en el banner */}
          <form
            onSubmit={(e) => { e.preventDefault(); void load(); }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
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

            {/* Selector de moneda */}
            {data && data.summaryByCurrency.length > 1 && (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none border-none"
              >
                {data.summaryByCurrency.map((s) => (
                  <option key={s.currency} value={s.currency} className="bg-[#0A0A0A]">
                    {s.currency}
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={loading || !periodStart || !periodEnd}
              className="bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              {loading ? (
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
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                  </svg>
                  Actualizar
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

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Ingresos",
            value: selectedSummary ? money(selectedSummary.revenueCents) : "—",
            currency: selectedSummary?.currency ?? "",
            positive: true,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            ),
          },
          {
            label: "Gastos",
            value: selectedSummary ? money(selectedSummary.expenseCents) : "—",
            currency: selectedSummary?.currency ?? "",
            positive: false,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                <polyline points="17 18 23 18 23 12"/>
              </svg>
            ),
          },
          {
            label: "Flujo neto",
            value: selectedSummary ? money(selectedSummary.netCents) : "—",
            currency: selectedSummary?.currency ?? "",
            positive: netPositive,
            highlight: true,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            ),
          },
          {
            label: "Margen",
            value: marginValue,
            currency: "profit / ingresos",
            positive: (selectedSummary?.marginBps ?? 0) >= 0,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            ),
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-black/[0.06] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-black/45">{k.label}</p>
              <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] flex items-center justify-center">
                {k.icon}
              </div>
            </div>
            <p className="text-2xl font-black text-black tracking-tight leading-none">{k.value}</p>
            <p className="text-[10px] text-black/35 mt-1.5">{k.currency}</p>
          </div>
        ))}
      </div>

      {/* ── GRÁFICAS ── */}
      {series.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <NetCashflowChart points={series} />
          <MarginChart points={series} />
        </div>
      ) : !loading && data ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center">
          <div className="w-12 h-12 bg-[#F5F4F2] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin datos para graficar</p>
          <p className="text-xs text-black/40">No hay movimientos en el rango seleccionado para {currency || "esta moneda"}.</p>
        </div>
      ) : null}

      {/* ── TABLA SERIE ── */}
      {recentSeries.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.06]">
            <p className="text-sm font-black text-black">Serie diaria</p>
            <p className="text-[10px] text-black/40 mt-0.5">
              Últimos 14 días · Moneda: {currency || "—"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {["Día", "Ingresos", "Gastos", "Neto", "Margen"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-black text-black/40 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSeries.map((p, i) => {
                  const isPositiveNet = p.netCents >= 0;
                  return (
                    <tr
                      key={p.bucket}
                      className={[
                        "border-b border-black/[0.04] transition-colors hover:bg-[#F5F4F2]",
                        i === 0 ? "bg-[#FAFAFA]" : "",
                      ].join(" ")}
                    >
                      <td className="px-5 py-3 font-bold text-black/70">
                        {formatBucketDisplay(p.bucket)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-black">
                        {money(p.revenueCents)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-black">
                        {money(p.expenseCents)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={[
                          "font-black",
                          isPositiveNet ? "text-emerald-600" : "text-red-600",
                        ].join(" ")}>
                          {isPositiveNet ? "+" : ""}{money(p.netCents)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {p.marginBps === null ? (
                          <span className="text-black/30">—</span>
                        ) : (
                          <span className={[
                            "font-bold",
                            p.marginBps >= 0 ? "text-[#F28705]" : "text-red-500",
                          ].join(" ")}>
                            {(p.marginBps / 100).toFixed(2)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}