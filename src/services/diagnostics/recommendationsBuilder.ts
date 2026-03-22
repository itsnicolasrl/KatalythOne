import { env } from "@/src/lib/env";
import type { Prisma } from "@/src/generated/prisma";

export type DiagnosticsContext = {
  companyId: string;
  latest: {
    id: string;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
    revenueCents: number;
    expenseCents: number;
    profitCents: number;
    profitMarginBps: number | null;
  };
  previousSnapshot: { id: string; revenueCents: number } | null;
  expenseRatio: number; // expense / revenue
  hasRevenue: boolean;
  profitMarginBps: number | null;
  marginLow: boolean;
  growthBps: number | null;
  hasPrevRevenue: boolean;
  customerDependence: {
    activeCustomersCount: number;
    totalCustomerRevenueCents: number;
    top1Share: number;
    top3Share: number;
    hhi: number;
  };
};

export function buildRecommendationForAlertType(params: {
  alertType: Prisma.AlertCreateManyInput["type"];
  ctx: DiagnosticsContext;
}) {
  const { alertType, ctx } = params;

  const formatImpactCentsToInt = (n: number) => {
    const rounded = Math.round(n);
    return Number.isFinite(rounded) ? Math.max(0, rounded) : null;
  };

  const targetMarginBps = env.ALERT_LOW_PROFIT_MARGIN_BPS_MAX + 100; // +1% por encima del umbral
  const targetProfitCents =
    ctx.latest.revenueCents > 0 ? Math.round((targetMarginBps * ctx.latest.revenueCents) / 10000) : 0;

  const lowProfitImpact = formatImpactCentsToInt(targetProfitCents - ctx.latest.profitCents);

  const negativeGrowthImpact =
    ctx.hasPrevRevenue && ctx.previousSnapshot
      ? formatImpactCentsToInt(ctx.previousSnapshot.revenueCents - ctx.latest.revenueCents)
      : null;

  /** Impacto en centavos como número; al persistir se convierte a BigInt. */
  type RecCore = {
    title: string;
    rationale: string;
    actionPlan: string;
    expectedImpactCents: number | null;
    sourceOnboardingSessionId: string | null;
  };

  const recByType: Record<Prisma.AlertCreateManyInput["type"], RecCore> = {
    FINANCIAL_RISK: {
      title: "Riesgo financiero: protege rentabilidad y control de costos",
      rationale:
        `Señales financieras relevantes detectadas en tu último snapshot. ` +
        `profitMarginBps=${ctx.profitMarginBps ?? "—"} bps, expenseRatio=${(ctx.expenseRatio * 100).toFixed(1)}%. ` +
        `Prioriza acciones que estabilicen margen y reduzcan presión de costos.`,
      actionPlan:
        "1) Clasifica gastos por impacto (fijos vs variables) y crea un plan de reducción por prioridad.\n" +
        "2) Revisa pricing/mix para recuperar margen por venta.\n" +
        "3) Define un límite mensual de costos (% sobre ingresos) y mide desvíos semana a semana.\n" +
        "4) Recalcula snapshot para validar mejora.",
      expectedImpactCents: lowProfitImpact,
      sourceOnboardingSessionId: null,
    },
    SALES_FALL: {
      title: "Caída de ventas: recupera tracción y reduce fricción del embudo",
      rationale:
        `Detectamos caída frente al período anterior (growthBps=${ctx.growthBps ?? "—"} bps). ` +
        `La prioridad es identificar dónde se pierde volumen (captación/conv.) y proteger el flujo de ingresos.`,
      actionPlan:
        "1) Segmenta ventas: por canal y por customerId para ubicar el origen de la caída.\n" +
        "2) Revisa conversión y tiempos de ciclo: elimina cuellos de botella.\n" +
        "3) Diseña un plan de recuperación (14-30 días) con 2 acciones de captación + 1 de conversión.\n" +
        "4) Vuelve a correr diagnóstico y compara crecimiento vs baseline.",
      expectedImpactCents: negativeGrowthImpact,
      sourceOnboardingSessionId: null,
    },
    REVENUE_ZERO: {
      title: "Recupera ingresos: cierra el gap de captación/registro",
      rationale:
        `Tu snapshot (${ctx.latest.periodStart.toLocaleDateString()} - ${ctx.latest.periodEnd.toLocaleDateString()}) muestra ` +
        `ingresos en 0. Para reactivar el motor, primero valida el registro de ventas y ` +
        `la trazabilidad de oportunidades a ingresos.`,
      actionPlan:
        "1) Audita el tracking: oportunidades -> ventas -> Revenue (customerId y occurredAt).\n" +
        "2) Revisa el embudo: número de leads/visitas y tasa de conversión reciente.\n" +
        "3) Define un plan de 14 días con 2 acciones de captación + 1 mejora de conversión.\n" +
        "4) Vuelve a correr diagnóstico para confirmar que reaparecen ingresos.",
      expectedImpactCents: null,
      sourceOnboardingSessionId: null,
    },
    LOW_PROFITABILITY: {
      title: "Mejora margen: ajusta estructura de costos y precios",
      rationale:
        `La rentabilidad cae por debajo del umbral. profitMarginBps=${ctx.profitMarginBps ?? "—"} bps ` +
        `y expenseRatio=${(ctx.expenseRatio * 100).toFixed(1)}%. Prioriza acciones que eleven ` +
        `profitCents manteniendo ingresos consistentes.`,
      actionPlan:
        "1) Identifica costos dominantes (fijos vs variables) y crea un plan de reducción por prioridad.\n" +
        "2) Ajusta precios o mix de oferta para elevar margen por venta.\n" +
        "3) Establece métricas de control: margen esperado vs margen real por período.\n" +
        "4) Ejecuta una mejora por semana y mide impacto en el siguiente snapshot.",
      expectedImpactCents: lowProfitImpact,
      sourceOnboardingSessionId: null,
    },
    COSTS_EXCESSIVE: {
      title: "Costos presionando rentabilidad: reduce estructura por palancas",
      rationale:
        `La presión de costos es alta: expenseRatio=${(ctx.expenseRatio * 100).toFixed(1)}%. ` +
        `El objetivo operativo es recuperar margen elevando profitCents por encima del umbral.`,
      actionPlan:
        "1) Congela gastos no esenciales y renegocia compras recurrentes.\n" +
        "2) Separa costos variables/semivariables y ajusta con criterios (capacidad, demanda).\n" +
        "3) Define un límite mensual de costos como porcentaje de ingresos (tracking en dashboard).\n" +
        "4) Reevalúa en el próximo período y revisa si el margen converge al objetivo.",
      expectedImpactCents: lowProfitImpact,
      sourceOnboardingSessionId: null,
    },
    NEGATIVE_GROWTH: {
      title: "Crecimiento negativo: protege ingresos y reduce fricción en el embudo",
      rationale:
        `Los ingresos muestran caída vs el período anterior: growthBps=${ctx.growthBps ?? "—"} bps. ` +
        `Primero diagnostica por qué (captación, conversión o retención) antes de recortar oferta.`,
      actionPlan:
        "1) Compara ventas por canal y por customerId: identifica dónde cae la tracción.\n" +
        "2) Revisa tasa de conversión y tiempos de ciclo; elimina cuellos de botella.\n" +
        "3) Implementa un plan de recuperación de clientes (nurturing + ofertas focalizadas).\n" +
        "4) Ajusta y vuelve a correr diagnóstico tras 1-2 ciclos de ventas.",
      expectedImpactCents: negativeGrowthImpact,
      sourceOnboardingSessionId: null,
    },
    CUSTOMER_DEPENDENCE: {
      title: "Dependencia de clientes: diversifica ingresos y reduce concentración",
      rationale:
        `Hay alta concentración en pocos clientes. top1Share=${(ctx.customerDependence.top1Share * 100).toFixed(1)}%, ` +
        `top3Share=${(ctx.customerDependence.top3Share * 100).toFixed(1)}% y HHI=${ctx.customerDependence.hhi.toFixed(3)}. ` +
        `Además, el conteo de clientes activos generadores es bajo (${ctx.customerDependence.activeCustomersCount}).`,
      actionPlan:
        "1) Selecciona 2-3 segmentos adicionales alineados con tu oferta y objetivo.\n" +
        "2) Define un plan de adquisición con KPIs semanales (leads calificados -> ventas).\n" +
        "3) Para el top cliente, crea un plan de continuidad (riesgo de churn) y una estrategia de expansión.\n" +
        "4) Mide concentración (top1/top3/HHI) en cada snapshot y ajusta el plan hasta bajar dependencia.",
      expectedImpactCents: null,
      sourceOnboardingSessionId: null,
    },
    OPERATIONAL_DISORDER: {
      title: "Ordena operaciones para sostener resultados",
      rationale:
        "Detectamos señales operativas que pueden estar afectando la ejecución. Revisa el sistema de procesos y la trazabilidad de tareas para reducir desviaciones.",
      actionPlan:
        "1) Verifica procesos clave y su estado (Process/ProcessStep).\n" +
        "2) Traduce desviaciones en tareas con responsables y fechas.\n" +
        "3) Usa el workflow para registrar cambios y comentarios de mejora.",
      expectedImpactCents: null,
      sourceOnboardingSessionId: null,
    },
    ONBOARDING_PROBLEM: {
      title: "Revisa el diagnóstico de onboarding",
      rationale:
        "Este tipo de recomendación proviene del onboarding. Ejecuta un diagnóstico y recalibra el plan de acción con datos reales.",
      actionPlan: "1) Confirma el perfil de negocio.\n2) Ejecuta diagnóstico.\n3) Implementa el plan y mide impacto.",
      expectedImpactCents: null,
      sourceOnboardingSessionId: null,
    },
  };

  const rec = recByType[alertType];

  // Si hay impacto monetario estimado, lo aseguramos como entero.
  const impact = rec.expectedImpactCents;
  if (impact !== null && impact !== undefined) {
    return { ...rec, expectedImpactCents: Math.round(impact) };
  }
  return rec;
}

