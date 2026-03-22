import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { buildExecutiveReport } from "@/src/services/analytics/executiveReportService";
import { ExecutiveRecommendationsModule } from "@/src/ui/modules/ExecutiveRecommendationsModule";

export const dynamic = "force-dynamic";

function severityLabel(sev: string) {
  switch (sev) {
    case "LOW":
      return "Baja";
    case "MEDIUM":
      return "Media";
    case "HIGH":
      return "Alta";
    case "CRITICAL":
      return "Crítica";
    default:
      return sev;
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "FINANCIAL_RISK":
      return "Riesgo financiero";
    case "SALES_FALL":
      return "Caída de ventas";
    case "CUSTOMER_DEPENDENCE":
      return "Dependencia de clientes";
    case "REVENUE_ZERO":
      return "Ingresos nulos";
    case "LOW_PROFITABILITY":
      return "Baja rentabilidad";
    case "COSTS_EXCESSIVE":
      return "Costos elevados";
    case "NEGATIVE_GROWTH":
      return "Crecimiento negativo";
    case "OPERATIONAL_DISORDER":
      return "Operación";
    case "ONBOARDING_PROBLEM":
      return "Onboarding";
    default:
      return type;
  }
}

function riskLabel(risk: string) {
  switch (risk) {
    case "BAJO":
      return "Bajo";
    case "MEDIO":
      return "Medio";
    case "ALTO":
      return "Alto";
    case "CRITICO":
      return "Crítico";
    default:
      return risk;
  }
}

function riskBadgeClass(risk: string) {
  switch (risk) {
    case "CRITICO":
      return "bg-red-50 text-red-700 border border-red-200";
    case "ALTO":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "MEDIO":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    default:
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }
}

export default async function InformePage() {
  const active = await getActiveCompanyForRequest();
  if (!active) redirect("/dashboard");

  const report = await buildExecutiveReport({
    companyId: active.id,
    companyName: active.name,
  });

  const fmt = (cents: number | null, cur: string | null) =>
    cents == null || !cur ? "—" : `${(cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${cur}`;
  const pct = (bps: number | null) => (bps == null ? "—" : `${(bps / 100).toFixed(2)}%`);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `linear-gradient(rgba(242,135,5,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.08) 1px,transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#F28705] mb-2">
            Informe automático
          </p>
          <h2 className="text-xl font-black text-white tracking-tight">{report.companyName}</h2>
          <p className="text-xs text-white/45 mt-2 max-w-xl leading-relaxed">
            Generado a partir de transacciones, snapshots de métricas, alertas y recomendaciones del sistema.
            Sin chat: solo datos consolidados y priorización por severidad.
          </p>
          <p className="text-[10px] text-white/30 mt-3">
            {new Date(report.generatedAt).toLocaleString("es-CO")} · {report.periodLabel}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 lg:col-span-1">
          <h3 className="text-sm font-black text-black mb-3">Salud global</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={["inline-flex items-center px-3 py-1 rounded-full text-xs font-black", riskBadgeClass(report.riskLevel)].join(" ")}>
                {riskLabel(report.riskLevel)}
              </div>
              <p className="text-[10px] text-black/40 mt-2">
                {report.riskLevel === "BAJO"
                  ? "La empresa tiene señales estables para escalar."
                  : report.riskLevel === "MEDIO"
                    ? "Hay palancas claras para mejorar y reducir riesgos."
                    : report.riskLevel === "ALTO"
                      ? "Existen riesgos relevantes; prioriza correcciones rápidas."
                      : "Riesgo elevado: enfoca urgencias para proteger caja y margen."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-black/45 mb-1">Score</p>
              <p className="text-3xl font-black text-black tabular-nums">{report.globalScore}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 lg:col-span-1">
          <h3 className="text-sm font-black text-black mb-3">Top riesgos</h3>
          {report.topFindings.length === 0 ? (
            <p className="text-sm text-black/45 py-4">Sin riesgos priorizados.</p>
          ) : (
            <div className="space-y-3">
              {report.topFindings.map((f) => (
                <div key={f.alertId} className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-black/[0.06] text-black/70">
                      {severityLabel(f.severity)}
                    </span>
                    <span className="text-[10px] text-black/45">{typeLabel(f.alertType)}</span>
                  </div>
                  <p className="text-sm font-black text-black">{f.title}</p>
                  {f.evidenceLines[0] && (
                    <p className="text-xs text-black/60 mt-1 leading-relaxed">{f.evidenceLines[0]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 lg:col-span-1">
          <h3 className="text-sm font-black text-black mb-3">Top acciones</h3>
          {report.topActions.length === 0 ? (
            <p className="text-sm text-black/45 py-4">Sin acciones sugeridas.</p>
          ) : (
            <div className="space-y-3">
              {report.topActions.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3">
                  {r.alertType && (
                    <p className="text-[9px] font-black text-[#F28705] uppercase mb-1">
                      {typeLabel(r.alertType)}
                    </p>
                  )}
                  <p className="text-sm font-black text-black">{r.problema}</p>
                  {r.impacto != null && (
                    <p className="text-xs text-emerald-700 font-bold mt-2">
                      ↑ {(r.impacto / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} {r.currency} estimado
                    </p>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-black/40 pt-1">
                Para ejecutarlas: usa la sección “Acciones para esta semana” con el botón de aceptar.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <h3 className="text-sm font-black text-black mb-3">Síntesis</h3>
        <ul className="space-y-2 text-sm text-black/70 leading-relaxed list-disc pl-5">
          {report.executiveSynthesis.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h3 className="text-xs font-black text-black/45 uppercase tracking-wide mb-4">Flujo (30 días)</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Ingresos</dt>
              <dd className="font-bold text-black tabular-nums">
                {fmt(report.cashflow30d.revenueCents, report.cashflow30d.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Gastos</dt>
              <dd className="font-bold text-black tabular-nums">
                {fmt(report.cashflow30d.expenseCents, report.cashflow30d.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Neto</dt>
              <dd className="font-bold text-black tabular-nums">
                {fmt(report.cashflow30d.netCents, report.cashflow30d.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Margen</dt>
              <dd className="font-bold text-black tabular-nums">{pct(report.cashflow30d.marginBps)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h3 className="text-xs font-black text-black/45 uppercase tracking-wide mb-4">Último mes / actividad</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Ingresos último mes</dt>
              <dd className="font-bold text-black tabular-nums">
                {fmt(report.monthly.lastMonthRevenueCents, report.monthly.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">vs mes anterior</dt>
              <dd className="font-bold text-black tabular-nums">{pct(report.monthly.growthVsPriorBps)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Margen último mes</dt>
              <dd className="font-bold text-black tabular-nums">{pct(report.monthly.lastMonthMarginBps)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-black/50">Clientes activos (30d)</dt>
              <dd className="font-bold text-black tabular-nums">{report.monthly.activeCustomers30d}</dd>
            </div>
          </dl>
        </div>
      </section>

      {report.snapshot.exists && (
        <section className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h3 className="text-sm font-black text-black mb-1">Snapshot guardado</h3>
          <p className="text-[10px] text-black/40 mb-4">
            Período cerrado en base de datos (base de alertas y diagnósticos vinculados).
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-black/45 text-[10px] uppercase font-bold">Cierre</dt>
              <dd className="font-bold text-black mt-1">
                {report.snapshot.periodEnd
                  ? new Date(report.snapshot.periodEnd).toLocaleDateString("es-CO")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-black/45 text-[10px] uppercase font-bold">Ingresos</dt>
              <dd className="font-bold text-black mt-1 tabular-nums">
                {fmt(report.snapshot.revenueCents, report.snapshot.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-black/45 text-[10px] uppercase font-bold">Gastos</dt>
              <dd className="font-bold text-black mt-1 tabular-nums">
                {fmt(report.snapshot.expenseCents, report.snapshot.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-black/45 text-[10px] uppercase font-bold">Margen</dt>
              <dd className="font-bold text-black mt-1 tabular-nums">{pct(report.snapshot.profitMarginBps)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-black text-black">Hallazgos priorizados</h3>
            <p className="text-[10px] text-black/40 mt-0.5">
              {report.counts.openAlerts} alerta(s) abierta(s) · orden por severidad
            </p>
          </div>
          <Link
            href="/dashboard/alerts"
            className="text-[10px] font-bold text-[#F28705] hover:underline whitespace-nowrap"
          >
            Gestionar alertas →
          </Link>
        </div>
        {report.findings.length === 0 ? (
          <p className="text-sm text-black/45 py-6 text-center">No hay alertas abiertas.</p>
        ) : (
          <div className="space-y-4">
            {report.findings.map((f) => (
              <article
                key={f.alertId}
                className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-black/[0.06] text-black/70">
                    {severityLabel(f.severity)}
                  </span>
                  <span className="text-[10px] text-black/45">{typeLabel(f.alertType)}</span>
                </div>
                <h4 className="text-sm font-black text-black leading-snug">{f.title}</h4>
                {f.evidenceLines.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {f.evidenceLines.map((line, i) => (
                      <p key={i} className="text-xs text-black/60 leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {f.recomendacion && (
                  <div className="mt-3 pt-3 border-t border-black/[0.06]">
                    <p className="text-[10px] font-black text-black/45 uppercase tracking-wide mb-1">Acción sugerida</p>
                    <p className="text-xs text-black/65 leading-relaxed whitespace-pre-wrap">{f.recomendacion}</p>
                  </div>
                )}
                {f.impactoCents != null && f.moneda && (
                  <p className="text-[10px] font-bold text-emerald-700 mt-2">
                    Impacto estimado: +{fmt(f.impactoCents, f.moneda)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <h3 className="text-sm font-black text-black mb-1">Recomendaciones accionables</h3>
        <p className="text-[10px] text-black/40 mb-4">
          Vinculadas al último snapshot. Acepta una recomendación para convertirla en proyecto con tareas automáticas.
        </p>
        <ExecutiveRecommendationsModule recommendations={report.recommendations} />
      </section>

      <div className="flex flex-wrap gap-3 pb-8">
        <Link href="/dashboard/metrics">
          <button
            type="button"
            className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] text-white text-xs font-bold px-5 py-2.5 transition-colors"
          >
            Actualizar métricas y diagnóstico
          </button>
        </Link>
        <Link href="/dashboard">
          <button
            type="button"
            className="rounded-xl border border-black/[0.1] bg-white text-black/70 text-xs font-bold px-5 py-2.5 hover:bg-black/[0.03]"
          >
            Volver al overview
          </button>
        </Link>
      </div>
    </div>
  );
}
