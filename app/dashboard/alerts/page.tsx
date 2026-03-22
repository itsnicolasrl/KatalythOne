import Link from "next/link";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getRecentAlerts, countOpenAlerts } from "@/src/services/alerts/alertsService";
import { getLatestMetricSnapshot } from "@/src/services/analytics/metricsService";

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

function severityStyles(sev: string) {
  switch (sev) {
    case "CRITICAL":
    case "HIGH":   return { badge: "bg-red-50 text-red-600",    dot: "bg-red-500",    ring: "border-red-100" };
    case "MEDIUM": return { badge: "bg-orange-50 text-orange-600", dot: "bg-[#F28705]", ring: "border-orange-100" };
    default:       return { badge: "bg-[#F5F4F2] text-black/50",  dot: "bg-black/20",  ring: "border-black/[0.06]" };
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "FINANCIAL_RISK":      return "Riesgo financiero";
    case "SALES_FALL":          return "Caída de ventas";
    case "CUSTOMER_DEPENDENCE": return "Dependencia de clientes";
    case "REVENUE_ZERO":        return "Sin ingresos";
    case "LOW_PROFITABILITY":   return "Baja rentabilidad";
    case "COSTS_EXCESSIVE":     return "Costos excesivos";
    case "NEGATIVE_GROWTH":     return "Crecimiento negativo";
    default:                    return type;
  }
}

function statusStyles(status: string) {
  switch (status) {
    case "OPEN":     return "bg-[#FFF3E0] text-[#F28705]";
    case "RESOLVED": return "bg-emerald-50 text-emerald-600";
    case "IGNORED":  return "bg-[#F5F4F2] text-black/40";
    default:         return "bg-[#F5F4F2] text-black/40";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "OPEN":     return "Abierta";
    case "RESOLVED": return "Resuelta";
    case "IGNORED":  return "Ignorada";
    default:         return status;
  }
}

// ── page ─────────────────────────────────────────────────
export default async function AlertsPage() {
  const activeCompany = await getActiveCompanyForRequest();
  if (!activeCompany) return null;

  const [openCount, latestSnapshot, alerts] = await Promise.all([
    countOpenAlerts(activeCompany.id),
    getLatestMetricSnapshot(activeCompany.id),
    getRecentAlerts({ companyId: activeCompany.id, take: 20 }),
  ]);

  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH");
  const mediumAlerts   = alerts.filter((a) => a.severity === "MEDIUM");
  const lowAlerts      = alerts.filter((a) => a.severity === "LOW");
  const resolvedAlerts = alerts.filter((a) => a.status === "RESOLVED");

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
          style={{ background: "radial-gradient(circle at top right, rgba(242,135,5,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Análisis de riesgos
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              Alertas — {activeCompany.name}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {openCount} alerta{openCount !== 1 ? "s" : ""} abierta{openCount !== 1 ? "s" : ""}
              {latestSnapshot ? " · Basadas en tu último snapshot" : ""}
            </p>
          </div>
          <Link href="/dashboard">
            <button className="rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-white text-xs font-bold px-4 py-2">
              ← Volver
            </button>
          </Link>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Abiertas",   value: openCount,          color: "text-[#F28705]", bg: "bg-[#FFF3E0]" },
          { label: "Críticas / Altas", value: criticalAlerts.length, color: "text-red-600",    bg: "bg-red-50" },
          { label: "Medias",     value: mediumAlerts.length, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Resueltas",  value: resolvedAlerts.length, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-xs font-bold text-black/55">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── LISTA DE ALERTAS ── */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin alertas registradas</p>
          <p className="text-xs text-black/40">Tu empresa está operando sin riesgos detectados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const sev = severityStyles(a.severity);
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border ${sev.ring} p-4 flex items-start gap-4 hover:shadow-sm transition-shadow`}
              >
                {/* Dot de severidad */}
                <div className="flex flex-col items-center gap-1.5 pt-0.5 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${sev.dot}`} />
                </div>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-black leading-tight">{a.title}</p>
                      <p className="text-[10px] text-black/40 mt-0.5">
                        {typeLabel(a.type)}
                      </p>
                    </div>
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${sev.badge}`}>
                        {severityLabel(a.severity)}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${statusStyles(a.status)}`}>
                        {statusLabel(a.status)}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <p className="text-[10px] text-black/30 mt-2">
                    {a.createdAt.toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}