"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type StrategicDiagnosisItem = {
  diagnostico: string;
  causa: string;
  impacto: string;
  recomendacion: string;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
};

type StrategicOnboardingAnalysis = {
  generatedAt: string;
  profile: {
    companyType: string;
    maturityLevel: string;
    businessStage: string;
    customerType: string;
    topClientConcentration: string;
    whatCompanyDoes: string;
    targetCustomer: string;
    offers: string[];
    businessFlowSteps: string[];
    incomeStreams: string[];
    expenseCategories: string[];
  };
  marketStudy: {
    inferredSector: string;
    competitionLevel: "BAJO" | "MEDIO" | "ALTO";
    demandTrend: "DECRECIENTE" | "ESTABLE" | "CRECIENTE";
    positioningSuggestions: string[];
  };
  scores: {
    structural: number;
    operations: number;
    financial: number;
    market: number;
    global: number;
    riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  };
  findings: StrategicDiagnosisItem[];
  riskTimeline: Array<{
    weekLabel: string;
    periodEnd: string;
    riskScore: number;
    riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  }>;
  actionableRecommendations: Array<{
    recommendationId: string;
    title: string;
    actionPlan: string;
    priority: "ALTA" | "MEDIA" | "BAJA";
    educational: { whyItAffects: string; howToMeasure: string };
    execution: {
      accepted: boolean;
      projectId: string | null;
      projectName: string | null;
      totalTasks: number;
      completedTasks: number;
      progressPercent: number;
    };
  }>;
};

type DiagnosisResponse = {
  strategicAnalysis?: StrategicOnboardingAnalysis | null;
  error?: string;
};

// ── helpers ──────────────────────────────────────────────
function riskColor(risk: StrategicOnboardingAnalysis["scores"]["riskLevel"]) {
  switch (risk) {
    case "CRITICO": return { badge: "bg-red-50 text-red-600",      bar: "bg-red-500",    dot: "bg-red-500" };
    case "ALTO":    return { badge: "bg-orange-50 text-orange-600", bar: "bg-orange-500", dot: "bg-orange-500" };
    case "MEDIO":   return { badge: "bg-amber-50 text-amber-600",   bar: "bg-amber-500",  dot: "bg-amber-500" };
    default:        return { badge: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" };
  }
}

function priorityColor(p: StrategicDiagnosisItem["prioridad"]) {
  switch (p) {
    case "ALTA":  return "bg-red-50 text-red-600";
    case "MEDIA": return "bg-amber-50 text-amber-600";
    default:      return "bg-emerald-50 text-emerald-600";
  }
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-black/50">{label}</span>
        <span className="text-xs font-black text-black">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#F28705] transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function OnboardingStrategicReport(props?: { refreshKey?: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<StrategicOnboardingAnalysis | null>(null);
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);
  const [acceptMessage, setAcceptMessage] = React.useState<{ text: string; ok: boolean } | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/onboarding/diagnosis", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as DiagnosisResponse | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el informe");
      setAnalysis(data?.strategicAnalysis ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load, props?.refreshKey]);

  const allAccepted =
    Boolean(analysis) &&
    analysis!.actionableRecommendations.length > 0 &&
    analysis!.actionableRecommendations.every((rec) => rec.execution.accepted);

  async function acceptRecommendation(recommendationId: string) {
    try {
      setAcceptingId(recommendationId);
      setAcceptMessage(null);
      const res = await fetch(`/api/recommendations/${recommendationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; alreadyAccepted?: boolean; project?: { name?: string } }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo aceptar");
      setAcceptMessage({
        ok: true,
        text: data?.alreadyAccepted
          ? "Esta recomendación ya fue aceptada y su proyecto ya existe."
          : `Recomendación aceptada. Proyecto "${data?.project?.name ?? "Implementación"}" creado con tareas.`,
      });
      await load();
    } catch (e) {
      setAcceptMessage({ ok: false, text: e instanceof Error ? e.message : "Error de red" });
    } finally {
      setAcceptingId(null);
    }
  }

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
              Informe estratégico inicial
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              Diagnóstico del negocio
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {analysis
                ? `Generado ${new Date(analysis.generatedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`
                : "Diagnóstico real para priorizar decisiones"}
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 transition-colors text-white text-xs font-bold px-4 py-2"
          >
            <svg className={loading ? "animate-spin" : ""} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-12 flex items-center justify-center gap-3">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
            <path d="M21 12a9 9 0 00-9-9"/>
          </svg>
          <p className="text-sm text-black/40 font-medium">Generando informe estratégico...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
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

      {/* Sin onboarding */}
      {!loading && !error && !analysis && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Informe no disponible</p>
          <p className="text-xs text-black/40 max-w-xs mx-auto">
            Completa el onboarding conversacional para desbloquear el diagnóstico estratégico.
          </p>
        </div>
      )}

      {analysis && (
        <>
          {/* Accept message */}
          {acceptMessage && (
            <div className={[
              "rounded-2xl px-4 py-3 flex items-center gap-3 border",
              acceptMessage.ok
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200",
            ].join(" ")}>
              <p className={`text-xs font-semibold ${acceptMessage.ok ? "text-emerald-700" : "text-red-700"}`}>
                {acceptMessage.text}
              </p>
            </div>
          )}

          {/* ── SCORES ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Score global */}
            <div className="lg:col-span-3 bg-[#0A0A0A] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundImage: `linear-gradient(rgba(242,135,5,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.06) 1px,transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30 mb-3">Score global</p>
                <p className="text-6xl font-black text-white leading-none">{analysis.scores.global}</p>
                <p className="text-[10px] text-white/30 mt-1">/ 100</p>
              </div>
              <div className="relative z-10 mt-4">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${riskColor(analysis.scores.riskLevel).badge}`}>
                  Riesgo {analysis.scores.riskLevel}
                </span>
              </div>
            </div>

            {/* Scores breakdown */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col justify-center gap-4">
              <ScoreBar label="Estructura" value={analysis.scores.structural} />
              <ScoreBar label="Operaciones" value={analysis.scores.operations} />
              <ScoreBar label="Finanzas" value={analysis.scores.financial} />
              <ScoreBar label="Mercado" value={analysis.scores.market} />
            </div>

            {/* Market study */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col gap-3">
              <p className="text-xs font-black text-black">Contexto de mercado</p>
              <div className="space-y-2">
                {[
                  { label: "Sector", value: analysis.marketStudy.inferredSector },
                  { label: "Competencia", value: analysis.marketStudy.competitionLevel },
                  { label: "Tendencia", value: analysis.marketStudy.demandTrend },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-black/40">{label}</span>
                    <span className="text-xs font-black text-black">{value}</span>
                  </div>
                ))}
              </div>
              {analysis.marketStudy.positioningSuggestions.length > 0 && (
                <div className="mt-1 pt-3 border-t border-black/[0.06]">
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-2">Sugerencias de posicionamiento</p>
                  <ul className="space-y-1.5">
                    {analysis.marketStudy.positioningSuggestions.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-[#F28705] flex-shrink-0 mt-1.5" />
                        <p className="text-[10px] text-black/55 leading-relaxed">{s}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── PERFIL DE EMPRESA ── */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.05]">
              <p className="text-sm font-black text-black">Perfil de la empresa</p>
              <p className="text-[10px] text-black/40 mt-0.5">Resumen del contexto capturado durante el onboarding</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-black/[0.04]">
              {[
                { label: "Qué resuelve / hace", value: analysis.profile.whatCompanyDoes },
                { label: "Cliente objetivo", value: analysis.profile.targetCustomer },
                { label: "Qué ofrece", value: analysis.profile.offers.join(", ") || "No definido" },
                { label: "Flujo operativo", value: analysis.profile.businessFlowSteps.join(" → ") || "No definido" },
                { label: "Fuentes de ingreso", value: analysis.profile.incomeStreams.join(", ") || "No definido" },
                { label: "Categorías de gasto", value: analysis.profile.expenseCategories.join(", ") || "No definido" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1.5">{label}</p>
                  <p className="text-xs text-black/70 leading-relaxed">{value || "No definido"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── HALLAZGOS ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-black">Hallazgos estratégicos</p>
              <span className="text-[10px] font-bold text-black/40">{analysis.findings.length} encontrados</span>
            </div>
            {analysis.findings.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.prioridad === "ALTA" ? "bg-red-500" :
                      item.prioridad === "MEDIA" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <p className="text-sm font-black text-black">{item.diagnostico}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 ${priorityColor(item.prioridad)}`}>
                    {item.prioridad}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.04]">
                  {[
                    { label: "Causa", value: item.causa, icon: "📊" },
                    { label: "Impacto", value: item.impacto, icon: "📈" },
                    { label: "Recomendación", value: item.recomendacion, icon: "🎯" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-white px-5 py-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1.5 flex items-center gap-1">
                        <span>{icon}</span>{label}
                      </p>
                      <p className="text-xs text-black/65 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── TIMELINE DE RIESGO ── */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <p className="text-sm font-black text-black mb-1">Evolución del riesgo</p>
            <p className="text-[10px] text-black/40 mb-5">Timeline semanal basado en snapshots</p>
            {analysis.riskTimeline.length === 0 ? (
              <p className="text-xs text-black/40 py-4 text-center">
                Sin snapshots suficientes para mostrar evolución semanal.
              </p>
            ) : (
              <div className="space-y-3">
                {analysis.riskTimeline.map((point) => {
                  const colors = riskColor(point.riskLevel);
                  return (
                    <div key={point.periodEnd} className="flex items-center gap-4">
                      <p className="text-[10px] font-bold text-black/40 w-14 flex-shrink-0">{point.weekLabel}</p>
                      <div className="flex-1 h-2 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                          style={{ width: `${point.riskScore}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${colors.badge}`}>
                        {point.riskLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RECOMENDACIONES ACCIONABLES ── */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-black text-black">Recomendaciones accionables</p>
              <p className="text-[10px] text-black/40 mt-0.5">
                Acepta una recomendación para convertirla en proyecto con tareas automáticas
              </p>
            </div>
            {analysis.actionableRecommendations.map((rec) => (
              <div key={rec.recommendationId} className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-black/[0.05]">
                  <div>
                    <p className="text-sm font-black text-black mb-1.5">{rec.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${priorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      {rec.execution.accepted && (
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                          En ejecución
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={acceptingId === rec.recommendationId || rec.execution.accepted}
                    onClick={() => void acceptRecommendation(rec.recommendationId)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white text-xs font-bold px-4 py-2 flex-shrink-0"
                  >
                    {acceptingId === rec.recommendationId ? (
                      <>
                        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                          <path d="M21 12a9 9 0 00-9-9"/>
                        </svg>
                        Creando...
                      </>
                    ) : rec.execution.accepted ? (
                      "Ya aceptada"
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Aceptar
                      </>
                    )}
                  </button>
                </div>

                {/* Progreso si está aceptada */}
                {rec.execution.accepted && (
                  <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-emerald-700">
                        {rec.execution.projectName ?? "Implementación"}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600">
                        {rec.execution.completedTasks}/{rec.execution.totalTasks} tareas
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-emerald-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${rec.execution.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Detalle */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.04]">
                  <div className="bg-white px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1.5">Por qué te afecta</p>
                    <p className="text-xs text-black/60 leading-relaxed">{rec.educational.whyItAffects}</p>
                  </div>
                  <div className="bg-white px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1.5">Cómo medir mejora</p>
                    <p className="text-xs text-black/60 leading-relaxed">{rec.educational.howToMeasure}</p>
                  </div>
                  <div className="bg-white px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1.5">Plan de acción</p>
                    <p className="text-xs text-black/60 leading-relaxed whitespace-pre-line">{rec.actionPlan}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── PLAN 30 DÍAS ── */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.05]">
              <p className="text-sm font-black text-black">Plan de 30 días sugerido</p>
              <p className="text-[10px] text-black/40 mt-0.5">Hoja de ruta inicial para activar mejoras</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/[0.04]">
              {[
                { period: "Semana 1", action: "Definir 3 KPIs críticos y línea base real de ingresos, gastos y clientes activos.", n: "01" },
                { period: "Semana 2–3", action: "Ejecutar acciones de mayor prioridad y medir resultado semanal por objetivo.", n: "02" },
                { period: "Semana 4", action: "Recalcular diagnóstico, ajustar estrategia y consolidar proceso operativo.", n: "03" },
              ].map(({ period, action, n }) => (
                <div key={n} className="bg-white px-5 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-black text-[#F28705] bg-[#FFF3E0] px-2 py-0.5 rounded-md">{n}</span>
                    <p className="text-xs font-black text-black">{period}</p>
                  </div>
                  <p className="text-xs text-black/55 leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {allAccepted && (
            <div className="flex flex-wrap gap-3 justify-center pt-2 pb-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/informe")}
                className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] text-white text-xs font-bold px-5 py-2.5 transition-colors"
              >
                Ir al informe automático
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}