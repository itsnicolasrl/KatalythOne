import Link from "next/link";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getLatestMetricSnapshot } from "@/src/services/analytics/metricsService";
import { countOpenAlerts, getRecentAlerts } from "@/src/services/alerts/alertsService";
import { computeCashflow } from "@/src/services/analytics/cashflowService";
import { computeMonthlyBusinessKpis } from "@/src/services/analytics/monthlyBusinessKpisService";
import { listCustomers } from "@/src/services/customers/customersService";
import { listProjects } from "@/src/services/projects/projectsService";
import { listRecommendationsForLatestSnapshot } from "@/src/services/recommendations/recommendationsService";
import { getBusinessDiagnosisForLatestSnapshot } from "@/src/services/diagnostics/businessDiagnosisService";
import { NetCashflowChart, MarginChart } from "@/src/ui/components/charts/CashflowCharts";
import { MonthlyIncomeChart } from "@/src/ui/components/charts/MonthlyIncomeChart";

// ── helpers ──────────────────────────────────────────────
function severityLabel(sev: string) {
  switch (sev) {
    case "LOW":      return "bajo";
    case "MEDIUM":   return "medio";
    case "HIGH":     return "alto";
    case "CRITICAL": return "crítico";
    default:         return sev;
  }
}

function severityColor(sev: string) {
  switch (sev) {
    case "HIGH":
    case "CRITICAL": return "bg-red-50 text-red-600";
    case "MEDIUM":   return "bg-orange-50 text-orange-600";
    default:         return "bg-[#F5F4F2] text-black/50";
  }
}

function severityDot(sev: string) {
  switch (sev) {
    case "HIGH":
    case "CRITICAL": return "bg-red-500";
    case "MEDIUM":   return "bg-[#F28705]";
    default:         return "bg-black/20";
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "FINANCIAL_RISK":      return "Riesgo financiero";
    case "SALES_FALL":          return "Caída de ventas";
    case "CUSTOMER_DEPENDENCE": return "Dependencia de clientes";
    case "REVENUE_ZERO":        return "Riesgo financiero";
    case "LOW_PROFITABILITY":   return "Riesgo financiero";
    case "COSTS_EXCESSIVE":     return "Costos excesivos";
    case "NEGATIVE_GROWTH":     return "Crecimiento negativo";
    default:                    return type;
  }
}

function previewAction(plan: string | null | undefined, maxLines = 3) {
  if (!plan) return null;
  return plan.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).slice(0, maxLines).join(" ");
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

// ── page ─────────────────────────────────────────────────
export default async function DashboardPage() {
  const activeCompany = await getActiveCompanyForRequest();

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-black/[0.07] p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h2 className="text-xl font-black text-black mb-2">Crea tu primera empresa</h2>
          <p className="text-sm text-black/50 leading-relaxed mb-6">
            Antes de analizar métricas y detectar riesgos, necesitas una empresa donde guardar tus datos.
          </p>
          <Link href="/dashboard/companies/new">
            <button className="w-full bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white font-bold py-3 rounded-full text-sm">
              Crear empresa
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    latestSnapshot,
    openAlertsCount,
    recentAlerts,
    cashflow,
    customers,
    projects,
    monthlyKpis,
    recommendations,
    businessDiagnoses,
  ] = await Promise.all([
    getLatestMetricSnapshot(activeCompany.id),
    countOpenAlerts(activeCompany.id),
    getRecentAlerts({ companyId: activeCompany.id, take: 5 }),
    computeCashflow({ companyId: activeCompany.id, startDate, endDate, bucket: "day" }),
    listCustomers(activeCompany.id),
    listProjects({ companyId: activeCompany.id }),
    computeMonthlyBusinessKpis({ companyId: activeCompany.id, monthsBack: 6, activeDays: 30, endDate }),
    listRecommendationsForLatestSnapshot({ companyId: activeCompany.id, take: 4 }),
    getBusinessDiagnosisForLatestSnapshot({ companyId: activeCompany.id, take: 3 }),
  ]);

  const primaryCurrency =
    cashflow.summaryByCurrency.sort((a, b) => b.revenueCents - a.revenueCents)[0]?.currency ?? null;
  const summary = primaryCurrency
    ? cashflow.summaryByCurrency.find((s) => s.currency === primaryCurrency) ?? null
    : null;
  const series = primaryCurrency ? cashflow.seriesByCurrency[primaryCurrency] ?? [] : [];

  const primaryMonthly = monthlyKpis.byCurrency[0] ?? null;
  const monthlyLatest = primaryMonthly?.latest ?? null;

  const topCustomers = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      totalCents: c.value.reduce((acc, v) => acc + v.totalCents, 0),
      lastPurchaseAt: c.lastPurchaseAt,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 4);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").slice(0, 5);

  const fmt = (cents: number) => (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 });
  const fmtPct = (bps: number | null) => bps === null ? "—" : `${(bps / 100).toFixed(2)}%`;

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
        <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right, rgba(242,135,5,0.2) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Resumen ejecutivo
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              Estado general — {activeCompany.name}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Vista consolidada · El informe completo se genera automáticamente desde tus datos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/dashboard/companies">
              <button className="rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-white text-xs font-bold px-4 py-2">
                Ver empresas
              </button>
            </Link>
            <Link href="/dashboard/informe">
              <button className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2">
                Informe automático
              </button>
            </Link>
            <Link href="/dashboard/alerts">
              <button className="rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-white text-xs font-bold px-4 py-2">
                Alertas
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI ROW 1: cashflow 30d ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Ingresos 30d",
            value: summary ? fmt(summary.revenueCents) : "—",
            currency: summary?.currency ?? latestSnapshot?.currency ?? "",
            trend: null,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            ),
          },
          {
            label: "Gastos 30d",
            value: summary ? fmt(summary.expenseCents) : "—",
            currency: summary?.currency ?? "",
            trend: null,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                <polyline points="17 18 23 18 23 12"/>
              </svg>
            ),
          },
          {
            label: "Flujo neto",
            value: summary ? fmt(summary.netCents) : "—",
            currency: summary?.currency ?? "",
            trend: null,
            icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            ),
          },
          {
            label: "Margen 30d",
            value: summary ? fmtPct(summary.marginBps) : "—",
            currency: "profit / ingresos",
            trend: null,
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
            <p className="text-2xl font-black text-black tracking-tight">{k.value}</p>
            <p className="text-[10px] text-black/40 mt-1.5">{k.currency}</p>
          </div>
        ))}
      </div>

      {/* ── KPI ROW 2: métricas mensuales ── */}
      {primaryMonthly && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Ingresos último mes", value: monthlyLatest ? fmt(monthlyLatest.revenueCents) : "—", sub: primaryMonthly.currency },
            { label: "Crecimiento", value: fmtPct(primaryMonthly.growthBps), sub: "vs mes anterior" },
            { label: "Margen último mes", value: fmtPct(monthlyLatest?.marginBps ?? null), sub: "profit / ingresos" },
            { label: "Clientes activos", value: String(monthlyKpis.activeCustomersCount), sub: "últimos 30 días" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <p className="text-[10px] font-bold text-black/45 mb-3">{k.label}</p>
              <p className="text-2xl font-black text-black tracking-tight">{k.value}</p>
              <p className="text-[10px] text-black/40 mt-1.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── DIAGNÓSTICOS + ALERTAS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Diagnósticos */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <h3 className="text-sm font-black text-black mb-0.5">Diagnósticos del negocio</h3>
          <p className="text-[10px] text-black/40 mb-4">Basados en tu último snapshot de métricas</p>
          {businessDiagnoses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-black/40">Sin diagnósticos aún.</p>
              <p className="text-[10px] text-black/30 mt-1">Corre "Análisis" para generarlos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {businessDiagnoses.map((d) => (
                <div key={d.alertId} className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${severityDot(d.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-black leading-tight">{d.diagnostico}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${severityColor(d.severity)}`}>
                          {severityLabel(d.severity)}
                        </span>
                        <span className="text-[10px] text-black/40">{typeLabel(d.alertType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-4">
                    <div>
                      <p className="text-[10px] font-black text-black/60 uppercase tracking-wide mb-0.5">Causa</p>
                      <p className="text-xs text-black/60 leading-relaxed">{d.causa}</p>
                    </div>
                    {d.impactoCents !== null && (
                      <div>
                        <p className="text-[10px] font-black text-black/60 uppercase tracking-wide mb-0.5">Impacto estimado</p>
                        <p className="text-xs font-bold text-emerald-600">
                          +{fmt(d.impactoCents)} {d.moneda}
                        </p>
                      </div>
                    )}
                    {d.recomendacion && (
                      <div>
                        <p className="text-[10px] font-black text-black/60 uppercase tracking-wide mb-0.5">Acción</p>
                        <p className="text-xs text-black/60 leading-relaxed">{previewAction(d.recomendacion, 3)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-black text-black">Alertas activas</h3>
            <div className="flex items-center gap-2">
              {openAlertsCount > 0 && (
                <span className="bg-[#F28705] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  {openAlertsCount}
                </span>
              )}
              <Link href="/dashboard/alerts" className="text-[10px] font-bold text-[#F28705] hover:underline">
                Ver todas →
              </Link>
            </div>
          </div>
          <p className="text-[10px] text-black/40 mb-4">
            {openAlertsCount === 0 ? "Sin riesgos detectados" : `${openAlertsCount} sin resolver`}
          </p>

          {recentAlerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p className="text-xs text-black/40">Sin alertas activas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex-shrink-0 mt-0.5 ${severityColor(a.severity)}`}>
                    {severityLabel(a.severity)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-black leading-tight">{a.title}</p>
                    <p className="text-[10px] text-black/40 mt-0.5">
                      {typeLabel(a.type)} · {a.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── GRÁFICAS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <h3 className="text-sm font-black text-black mb-0.5">Flujo neto</h3>
            <p className="text-[10px] text-black/40 mb-4">Últimos 30 días</p>
            <NetCashflowChart points={series} />
          </div>
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <h3 className="text-sm font-black text-black mb-0.5">Margen</h3>
            <p className="text-[10px] text-black/40 mb-4">Evolución de rentabilidad</p>
            <MarginChart points={series} />
          </div>
          {primaryMonthly && (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
              <h3 className="text-sm font-black text-black mb-0.5">Ingresos mensuales</h3>
              <p className="text-[10px] text-black/40 mb-4">Últimos 6 meses</p>
              <MonthlyIncomeChart
                points={primaryMonthly.series.map((p) => ({
                  bucket: p.bucket,
                  revenueCents: p.revenueCents,
                }))}
              />
            </div>
          )}
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-4">

          {/* Clientes top */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-black">Clientes top</h3>
                <p className="text-[10px] text-black/40">Por valor de ventas</p>
              </div>
              <Link href="/dashboard/customers" className="text-[10px] font-bold text-[#F28705] hover:underline">
                Ver todos →
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-xs text-black/40 py-4 text-center">Sin ventas registradas.</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c) => (
                  <Link key={c.id} href={`/dashboard/customers/${c.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F5F4F2] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-sm font-black text-[#F28705]">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-black truncate">{c.name}</p>
                        <p className="text-[10px] text-black/40">
                          {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString("es-CO") : "—"}
                        </p>
                      </div>
                      <p className="text-xs font-black text-black flex-shrink-0">
                        {fmt(c.totalCents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Proyectos activos */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-black">Proyectos activos</h3>
                <p className="text-[10px] text-black/40">
                  {projects.filter((p) => p.status === "ACTIVE").length} en curso
                </p>
              </div>
              <Link href="/dashboard/operations" className="text-[10px] font-bold text-[#F28705] hover:underline">
                Ver todos →
              </Link>
            </div>
            {activeProjects.length === 0 ? (
              <p className="text-xs text-black/40 py-4 text-center">Sin proyectos activos.</p>
            ) : (
              <div className="space-y-2">
                {activeProjects.map((p) => (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F5F4F2] transition-colors cursor-pointer">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F28705] flex-shrink-0" />
                      <p className="text-xs font-bold text-black flex-1 truncate">{p.name}</p>
                      <p className="text-[10px] text-black/35 flex-shrink-0">
                        {new Date(p.updatedAt).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recomendaciones */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <h3 className="text-sm font-black text-black mb-0.5">Recomendaciones</h3>
            <p className="text-[10px] text-black/40 mb-4">Basadas en tu último análisis</p>
            {recommendations.length === 0 ? (
              <p className="text-xs text-black/40 py-4 text-center">Sin recomendaciones aún.</p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-xl bg-[#F5F4F2] p-3">
                    {r.alertType && (
                      <p className="text-[9px] font-black text-[#F28705] uppercase tracking-wide mb-1">
                        {typeLabel(r.alertType)}
                      </p>
                    )}
                    <p className="text-xs font-black text-black mb-1">{r.problema}</p>
                    {r.accion && (
                      <p className="text-[10px] text-black/55 leading-relaxed">
                        {previewAction(r.accion, 2)}
                      </p>
                    )}
                    {r.impacto !== null && (
                      <p className="text-[10px] font-bold text-emerald-600 mt-1.5">
                        ↑ +{fmt(r.impacto)} {r.currency} estimado
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}