"use client";

import * as React from "react";

type SimulationInputs = {
  priceIncreasePercent: number;
  expenseIncreasePercent: number;
  newCustomersCount: number;
};

type SimulationImpactFinancial = {
  currency: string;
  baselineRevenueCents: number;
  baselineExpenseCents: number;
  baselineProfitCents: number;
  baselineProfitMarginBps: number | null;
  projectedRevenueCents: number;
  projectedExpenseCents: number;
  projectedProfitCents: number;
  projectedProfitMarginBps: number | null;
  deltaRevenueCents: number;
  deltaExpenseCents: number;
  deltaProfitCents: number;
  deltaProfitMarginBps: number | null;
};

type SimulationImpactOperational = {
  loadScore: number;
  loadLevel: "bajo" | "medio" | "alto";
  expectedAreas: string[];
  notes: string;
};

type SimulationResponse = {
  simulationRunId: string;
  scenarioType: string;
  inputs: SimulationInputs;
  impactFinancial: SimulationImpactFinancial;
  impactOperational: SimulationImpactOperational;
};

// ── helpers ──────────────────────────────────────────────
function money(cents: number) {
  return (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
}

function delta(cents: number) {
  const positive = cents >= 0;
  return {
    label: `${positive ? "+" : ""}${money(cents)}`,
    cls: positive ? "text-emerald-600" : "text-red-500",
  };
}

function deltaPct(bps: number | null) {
  if (bps === null) return { label: "—", cls: "text-black/30" };
  const positive = bps >= 0;
  return {
    label: `${positive ? "+" : ""}${(bps / 100).toFixed(2)}%`,
    cls: positive ? "text-emerald-600" : "text-red-500",
  };
}

function loadStyles(level: SimulationImpactOperational["loadLevel"]) {
  switch (level) {
    case "alto":  return { badge: "bg-red-50 text-red-600",    bar: "bg-red-500" };
    case "medio": return { badge: "bg-amber-50 text-amber-600", bar: "bg-amber-500" };
    default:      return { badge: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" };
  }
}

// ── component ────────────────────────────────────────────
export function SimulationModule() {
  const [inputs, setInputs] = React.useState<SimulationInputs>({
    priceIncreasePercent: 10,
    expenseIncreasePercent: 5,
    newCustomersCount: 5,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SimulationResponse | null>(null);

  async function onRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analytics/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(inputs),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | SimulationResponse | null;
      if (!res.ok) {
        const maybe = json as { error?: string } | null;
        throw new Error(maybe?.error ?? "No se pudo simular");
      }
      setResult(json as SimulationResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  const f = result?.impactFinancial;
  const op = result?.impactOperational;

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
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Proyección de escenarios
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Simulación</h2>
            <p className="text-xs text-white/40 mt-1">
              Estima impacto financiero y operativo desde el último snapshot
            </p>
          </div>

          {/* Inputs inline en el banner */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {[
              { label: "Subir precios", key: "priceIncreasePercent", suffix: "%" },
              { label: "Aumentar gastos", key: "expenseIncreasePercent", suffix: "%" },
              { label: "Nuevos clientes", key: "newCustomersCount", suffix: "" },
            ].map(({ label, key, suffix }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-white/35 uppercase tracking-[0.1em]">{label}</span>
                <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-2">
                  <input
                    type="number"
                    step={key === "newCustomersCount" ? "1" : "0.1"}
                    value={inputs[key as keyof SimulationInputs]}
                    onChange={(e) =>
                      setInputs((s) => ({ ...s, [key]: Number(e.target.value) }))
                    }
                    className="bg-transparent text-white text-sm font-black outline-none w-14 text-center [color-scheme:dark]"
                  />
                  {suffix && <span className="text-white/40 text-xs font-bold">{suffix}</span>}
                </div>
              </div>
            ))}

            <button
              onClick={() => void onRun()}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-3 rounded-xl self-end"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Simulando...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Simular
                </>
              )}
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

      {/* Sin resultados aún */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="12" y1="21" x2="12" y2="4"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Configura y ejecuta una simulación</p>
          <p className="text-xs text-black/40 max-w-xs mx-auto">
            Ajusta los parámetros arriba y presiona "Simular" para proyectar el impacto en tu empresa.
          </p>
        </div>
      )}

      {/* ── RESULTADOS ── */}
      {result && f && op && (
        <>
          {/* Inputs usados */}
          <div className="bg-white rounded-2xl border border-black/[0.06] px-5 py-4 flex items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/30 flex-shrink-0">Escenario simulado</p>
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { label: "Precios +", value: `${result.inputs.priceIncreasePercent}%` },
                { label: "Gastos +", value: `${result.inputs.expenseIncreasePercent}%` },
                { label: "Nuevos clientes", value: result.inputs.newCustomersCount },
                { label: "Moneda", value: f.currency },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-black/40 font-medium">{label}</span>
                  <span className="text-xs font-black text-black bg-[#F5F4F2] px-2 py-0.5 rounded-lg">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KPI comparación */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Ingresos",
                base: money(f.baselineRevenueCents),
                proj: money(f.projectedRevenueCents),
                d: delta(f.deltaRevenueCents),
              },
              {
                label: "Gastos",
                base: money(f.baselineExpenseCents),
                proj: money(f.projectedExpenseCents),
                d: delta(f.deltaExpenseCents),
              },
              {
                label: "Beneficio",
                base: money(f.baselineProfitCents),
                proj: money(f.projectedProfitCents),
                d: delta(f.deltaProfitCents),
              },
              {
                label: "Margen",
                base: f.baselineProfitMarginBps === null ? "—" : `${(f.baselineProfitMarginBps / 100).toFixed(2)}%`,
                proj: f.projectedProfitMarginBps === null ? "—" : `${(f.projectedProfitMarginBps / 100).toFixed(2)}%`,
                d: deltaPct(f.deltaProfitMarginBps),
              },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <p className="text-[10px] font-bold text-black/40 mb-3">{k.label}</p>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-black/40 line-through">{k.base}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span className="text-sm font-black text-black">{k.proj}</span>
                </div>
                <span className={`text-xs font-black ${k.d.cls}`}>{k.d.label}</span>
              </div>
            ))}
          </div>

          {/* Impacto financiero detallado + Impacto operativo */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Financiero */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <p className="text-sm font-black text-black">Impacto financiero detallado</p>
                <p className="text-[10px] text-black/40 mt-0.5">Baseline vs proyección · {f.currency}</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {[
                  {
                    label: "Ingresos",
                    base: f.baselineRevenueCents,
                    proj: f.projectedRevenueCents,
                    d: f.deltaRevenueCents,
                    isPct: false,
                  },
                  {
                    label: "Gastos",
                    base: f.baselineExpenseCents,
                    proj: f.projectedExpenseCents,
                    d: f.deltaExpenseCents,
                    isPct: false,
                  },
                  {
                    label: "Beneficio",
                    base: f.baselineProfitCents,
                    proj: f.projectedProfitCents,
                    d: f.deltaProfitCents,
                    isPct: false,
                  },
                ].map(({ label, base, proj, d }) => {
                  const dInfo = delta(d);
                  return (
                    <div key={label} className="grid grid-cols-4 gap-4 px-5 py-4 items-center">
                      <p className="text-xs font-black text-black/60">{label}</p>
                      <p className="text-xs text-black/40 text-right">{money(base)}</p>
                      <p className="text-xs font-black text-black text-right">{money(proj)}</p>
                      <p className={`text-xs font-black text-right ${dInfo.cls}`}>{dInfo.label}</p>
                    </div>
                  );
                })}
                {/* Margen */}
                <div className="grid grid-cols-4 gap-4 px-5 py-4 items-center">
                  <p className="text-xs font-black text-black/60">Margen</p>
                  <p className="text-xs text-black/40 text-right">
                    {f.baselineProfitMarginBps === null ? "—" : `${(f.baselineProfitMarginBps / 100).toFixed(2)}%`}
                  </p>
                  <p className="text-xs font-black text-black text-right">
                    {f.projectedProfitMarginBps === null ? "—" : `${(f.projectedProfitMarginBps / 100).toFixed(2)}%`}
                  </p>
                  <p className={`text-xs font-black text-right ${deltaPct(f.deltaProfitMarginBps).cls}`}>
                    {deltaPct(f.deltaProfitMarginBps).label}
                  </p>
                </div>
                {/* Header de columnas */}
                <div className="grid grid-cols-4 gap-4 px-5 py-2 bg-[#FAFAFA]">
                  <p className="text-[9px] text-black/30" />
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/25 text-right">Base</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/25 text-right">Proyectado</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/25 text-right">Delta</p>
                </div>
              </div>
            </div>

            {/* Operativo */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <p className="text-sm font-black text-black">Impacto operativo</p>
                <p className="text-[10px] text-black/40 mt-0.5">Presión operativa estimada (0–100)</p>
              </div>
              <div className="px-5 py-5 space-y-5">
                {/* Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-black/50">Score de carga</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${loadStyles(op.loadLevel).badge}`}>
                        {op.loadLevel.charAt(0).toUpperCase() + op.loadLevel.slice(1)}
                      </span>
                      <span className="text-sm font-black text-black">{op.loadScore}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${loadStyles(op.loadLevel).bar}`}
                      style={{ width: `${op.loadScore}%` }}
                    />
                  </div>
                </div>

                {/* Áreas */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/30 mb-3">Áreas impactadas</p>
                  {op.expectedAreas.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Sin impacto operativo estimado
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {op.expectedAreas.map((area) => (
                        <span key={area} className="text-[10px] font-bold text-black/60 bg-[#F5F4F2] px-2.5 py-1 rounded-lg">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/30 mb-2">Notas</p>
                  <p className="text-xs text-black/55 leading-relaxed bg-[#FAFAFA] rounded-xl px-4 py-3">
                    {op.notes}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}