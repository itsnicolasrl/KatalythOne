import { computeCashflow } from "@/src/services/analytics/cashflowService";
import { computeMonthlyBusinessKpis } from "@/src/services/analytics/monthlyBusinessKpisService";
import { getLatestMetricSnapshot } from "@/src/services/analytics/metricsService";
import { getBusinessDiagnosisForLatestSnapshot } from "@/src/services/diagnostics/businessDiagnosisService";
import { listRecommendationsForLatestSnapshot } from "@/src/services/recommendations/recommendationsService";

export type ExecutiveReportFinding = {
  alertId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  alertType: string;
  title: string;
  /** Hechos y texto anclado a datos (causa / mensaje de alerta). */
  evidenceLines: string[];
  recomendacion: string | null;
  impactoCents: number | null;
  moneda: string | null;
};

export type ExecutiveReport = {
  /** 0-100: a mayor valor, mayor salud general percibida. */
  globalScore: number;
  riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  generatedAt: string;
  companyName: string;
  companyId: string;
  periodLabel: string;
  snapshot: {
    exists: boolean;
    periodEnd: string | null;
    currency: string | null;
    revenueCents: number | null;
    expenseCents: number | null;
    profitCents: number | null;
    profitMarginBps: number | null;
  };
  cashflow30d: {
    currency: string | null;
    revenueCents: number | null;
    expenseCents: number | null;
    netCents: number | null;
    marginBps: number | null;
  };
  monthly: {
    currency: string | null;
    lastMonthRevenueCents: number | null;
    growthVsPriorBps: number | null;
    lastMonthMarginBps: number | null;
    activeCustomers30d: number;
  };
  counts: {
    openAlerts: number;
    findingsListed: number;
    recommendationsListed: number;
  };
  /** Hallazgos priorizados por severidad + recencia (misma base que alertas/diagnósticos). */
  findings: ExecutiveReportFinding[];
  topFindings: ExecutiveReportFinding[];
  recommendations: Awaited<ReturnType<typeof listRecommendationsForLatestSnapshot>>;
  topActions: ExecutiveReport["recommendations"];
  /** Síntesis en lenguaje natural, generada solo a partir de cifras y conteos (sin LLM). */
  executiveSynthesis: string[];
};

function severityScore(s: string): number {
  switch (s) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

function fmtMoney(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${currency}`;
}

function fmtPct(bps: number | null) {
  if (bps === null) return null;
  return `${(bps / 100).toFixed(2)}%`;
}

function riskLevelFromScore(score: number): ExecutiveReport["riskLevel"] {
  if (score >= 75) return "BAJO";
  if (score >= 50) return "MEDIO";
  if (score >= 25) return "ALTO";
  return "CRITICO";
}

function clamp0_100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeGlobalScore(params: {
  latestSnapshot: Awaited<ReturnType<typeof getLatestMetricSnapshot>> | null;
  cashflowSummary: { netCents: number | null } | null;
  monthlyGrowthBps: number | null;
  profitMarginBps: number | null;
  expenseRatio: number;
  diagnoses: Array<{
    severity: string;
    status?: string;
  }>;
}) {
  const { latestSnapshot, cashflowSummary, monthlyGrowthBps, profitMarginBps, expenseRatio, diagnoses } = params;

  // Base: si hay datos, partimos alto; si falta snapshot, bajamos fuerte.
  let score = latestSnapshot ? 82 : 35;

  // Rentabilidad / margen
  if (profitMarginBps === null) {
    score -= 4;
  } else if (profitMarginBps <= 0) {
    score -= 22;
  } else if (profitMarginBps <= 500) {
    score -= 14;
  } else if (profitMarginBps <= 800) {
    score -= 8;
  }

  // Presión de costos
  if (expenseRatio >= 0.9) score -= 20;
  else if (expenseRatio >= 0.75) score -= 13;
  else if (expenseRatio >= 0.65) score -= 7;

  // Flujo neto 30d
  if (cashflowSummary?.netCents != null && cashflowSummary.netCents < 0) score -= 18;

  // Crecimiento (si existe baseline)
  if (monthlyGrowthBps != null) {
    if (monthlyGrowthBps <= -1000) score -= 18;
    else if (monthlyGrowthBps <= -500) score -= 12;
    else if (monthlyGrowthBps <= -100) score -= 6;
  }

  // Presión de alertas (solo abiertas, mismas señales del snapshot)
  const openDiags = diagnoses.filter((d) => d.status === "OPEN");
  let alertPenalty = 0;
  for (const d of openDiags) {
    switch (d.severity) {
      case "CRITICAL":
        alertPenalty += 14;
        break;
      case "HIGH":
        alertPenalty += 10;
        break;
      case "MEDIUM":
        alertPenalty += 6;
        break;
      default:
        alertPenalty += 3;
        break;
    }
  }
  score -= alertPenalty;

  return clamp0_100(score);
}

/**
 * Informe ejecutivo automático: agrega KPIs, snapshot, alertas abiertas,
 * diagnósticos y recomendaciones ya calculados en base de datos.
 */
export async function buildExecutiveReport(params: {
  companyId: string;
  companyName: string;
}): Promise<ExecutiveReport> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Snapshot + señales (KPIs ya calculados) + diagnósticos (alertas ligadas al snapshot) + recomendaciones.
  const [
    latestSnapshot,
    cashflow,
    monthlyKpis,
    diagnoses,
    recommendations,
  ] = await Promise.all([
    getLatestMetricSnapshot(params.companyId),
    computeCashflow({ companyId: params.companyId, startDate, endDate, bucket: "day" }),
    computeMonthlyBusinessKpis({
      companyId: params.companyId,
      monthsBack: 6,
      activeDays: 30,
      endDate,
    }),
    getBusinessDiagnosisForLatestSnapshot({ companyId: params.companyId, take: 40 }),
    listRecommendationsForLatestSnapshot({ companyId: params.companyId, take: 15 }),
  ]);

  const primaryCurrency =
    cashflow.summaryByCurrency.sort((a, b) => b.revenueCents - a.revenueCents)[0]?.currency ?? null;
  const summary = primaryCurrency
    ? cashflow.summaryByCurrency.find((s) => s.currency === primaryCurrency) ?? null
    : null;

  const primaryMonthly = monthlyKpis.byCurrency[0] ?? null;
  const monthlyLatest = primaryMonthly?.latest ?? null;

  const diagnosesOpenLike = diagnoses.map((d) => ({
    severity: d.severity,
    status: d.status,
  }));

  const expenseRatio =
    latestSnapshot && latestSnapshot.revenueCents > 0 ? latestSnapshot.expenseCents / latestSnapshot.revenueCents : 0;

  const profitMarginBps = latestSnapshot?.profitMarginBps ?? null;
  const netCents30d = cashflow?.summaryByCurrency
    ? (() => {
        const s = primaryCurrency ? cashflow.summaryByCurrency.find((x) => x.currency === primaryCurrency) ?? null : null;
        return s?.netCents ?? null;
      })()
    : null;

  const globalScore = computeGlobalScore({
    latestSnapshot,
    cashflowSummary: { netCents: netCents30d },
    monthlyGrowthBps: primaryMonthly?.growthBps ?? null,
    profitMarginBps,
    expenseRatio,
    diagnoses: diagnosesOpenLike,
  });

  const riskLevel = riskLevelFromScore(globalScore);

  const findings: ExecutiveReportFinding[] = diagnoses.map((d) => {
    const evidenceLines: string[] = [];
    const raw = (d.causa ?? "").trim();
    if (raw) evidenceLines.push(raw);
    const rec = d.recomendacion?.trim() ?? "";
    return {
      alertId: d.alertId,
      severity: d.severity,
      alertType: d.alertType,
      title: d.diagnostico,
      evidenceLines,
      recomendacion: rec ? rec : null,
      impactoCents: d.impactoCents ?? null,
      moneda: d.moneda ?? latestSnapshot?.currency ?? primaryCurrency,
    };
  });

  findings.sort((x, y) => {
    const ds = severityScore(y.severity) - severityScore(x.severity);
    if (ds !== 0) return ds;
    return 0; // (recencia no disponible en findings; el servicio ya ordena diagnósticos por createdAt)
  });

  const topFindings = findings.slice(0, 3);

  // Priorización de acciones: por severidad del tipo de alerta + impacto monetario cuando existe.
  const severityByAlertType = new Map<string, number>();
  for (const f of findings) {
    const cur = severityByAlertType.get(f.alertType) ?? -1;
    severityByAlertType.set(f.alertType, Math.max(cur, severityScore(f.severity)));
  }

  const topActions = [...recommendations].sort((a, b) => {
    const sa = a.alertType ? (severityByAlertType.get(a.alertType) ?? 0) : 0;
    const sb = b.alertType ? (severityByAlertType.get(b.alertType) ?? 0) : 0;
    if (sb !== sa) return sb - sa;
    const ia = a.impacto ?? -1;
    const ib = b.impacto ?? -1;
    return ib - ia;
  });

  const openAlertsCount = diagnoses.filter((d) => d.status === "OPEN").length;

  const executiveSynthesis: string[] = [];
  const highOpen = findings.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  const net = summary?.netCents ?? null;
  const growthBps = primaryMonthly?.growthBps ?? null;
  const margin = summary?.marginBps ?? null;

  if (!latestSnapshot) {
    executiveSynthesis.push(
      "Aún no hay un snapshot de métricas guardado. Ejecuta un ciclo de análisis (Métricas → actualizar) para consolidar ingresos, gastos y señales automáticas."
    );
  } else {
    executiveSynthesis.push(
      `Último snapshot consolidado al ${new Date(latestSnapshot.periodEnd).toLocaleDateString("es-CO")} en ${latestSnapshot.currency}.`
    );
  }

  if (primaryCurrency && summary) {
    executiveSynthesis.push(
      `Ventana móvil 30 días (${primaryCurrency}): ingresos ${fmtMoney(summary.revenueCents, primaryCurrency)}, gastos ${fmtMoney(summary.expenseCents, primaryCurrency)}, flujo neto ${fmtMoney(summary.netCents, primaryCurrency)}${margin != null ? `, margen ${fmtPct(margin)}` : ""}.`
    );
  }

  if (primaryMonthly && monthlyLatest) {
    const g = fmtPct(growthBps);
    executiveSynthesis.push(
      `Último mes (${primaryMonthly.currency}): ingresos ${fmtMoney(monthlyLatest.revenueCents, primaryMonthly.currency)}${g ? `, variación vs mes anterior ${g}` : ""}${monthlyLatest.marginBps != null ? `, margen ${fmtPct(monthlyLatest.marginBps)}` : ""}.`
    );
  }

  executiveSynthesis.push(
    `Clientes con actividad en los últimos 30 días: ${monthlyKpis.activeCustomersCount}.`
  );

  if (openAlertsCount === 0) {
    executiveSynthesis.push("No hay alertas abiertas registradas en este momento.");
  } else {
    executiveSynthesis.push(
      `${openAlertsCount} alerta(s) abierta(s)${highOpen > 0 ? `, ${highOpen} de prioridad alta o crítica` : ""}.`
    );
  }

  if (net !== null && net < 0) {
    executiveSynthesis.push(
      "El flujo neto de la ventana de 30 días es negativo: conviene revisar gastos, cobros pendientes y composición de ingresos."
    );
  }

  if (growthBps !== null && growthBps < -300) {
    executiveSynthesis.push(
      "La variación de ingresos respecto al mes anterior muestra una contracción relevante; contrasta con estacionalidad y pipeline comercial."
    );
  }

  if (openAlertsCount === 0 && net !== null && net >= 0 && (growthBps === null || growthBps >= 0)) {
    executiveSynthesis.push(
      "Las señales automáticas no marcan riesgos urgentes en el período analizado; seguimiento periódico sigue recomendado."
    );
  }

  return {
    globalScore,
    riskLevel,
    generatedAt: endDate.toISOString(),
    companyName: params.companyName,
    companyId: params.companyId,
    periodLabel: "Últimos 30 días + último snapshot",
    snapshot: {
      exists: Boolean(latestSnapshot),
      periodEnd: latestSnapshot ? new Date(latestSnapshot.periodEnd).toISOString() : null,
      currency: latestSnapshot?.currency ?? null,
      revenueCents: latestSnapshot?.revenueCents ?? null,
      expenseCents: latestSnapshot?.expenseCents ?? null,
      profitCents: latestSnapshot?.profitCents ?? null,
      profitMarginBps: latestSnapshot?.profitMarginBps ?? null,
    },
    cashflow30d: {
      currency: primaryCurrency,
      revenueCents: summary?.revenueCents ?? null,
      expenseCents: summary?.expenseCents ?? null,
      netCents: summary?.netCents ?? null,
      marginBps: summary?.marginBps ?? null,
    },
    monthly: {
      currency: primaryMonthly?.currency ?? null,
      lastMonthRevenueCents: monthlyLatest?.revenueCents ?? null,
      growthVsPriorBps: growthBps,
      lastMonthMarginBps: monthlyLatest?.marginBps ?? null,
      activeCustomers30d: monthlyKpis.activeCustomersCount,
    },
    counts: {
      openAlerts: openAlertsCount,
      findingsListed: findings.length,
      recommendationsListed: recommendations.length,
    },
    findings,
    topFindings,
    recommendations,
    topActions,
    executiveSynthesis,
  };
}
