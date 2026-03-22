import { getPrisma } from "@/src/db/prisma";
import type { Prisma } from "@/src/generated/prisma";
import { env } from "@/src/lib/env";
import { centsFromPrisma, mapSnapshotCentsFields } from "@/src/lib/money/centsBigInt";
import { buildRecommendationForAlertType, type DiagnosticsContext } from "@/src/services/diagnostics/recommendationsBuilder";

export async function runDiagnosticsForLatestSnapshot(companyId: string) {
  const prisma = getPrisma();
  const latest = await prisma.metricSnapshot.findFirst({
    where: { companyId },
    orderBy: { periodEnd: "desc" },
  });

  if (!latest) return { created: 0, snapshotId: null, findings: [] as unknown[] };

  const latestForCtx = mapSnapshotCentsFields(latest);

  const [existingForSnapshot, previousSnapshot, customerDependenceRows] = await Promise.all([
    prisma.alert.findMany({
      where: { snapshotId: latest.id },
      select: { type: true },
    }),
    prisma.metricSnapshot.findFirst({
      where: {
        companyId,
        currency: latest.currency,
        periodEnd: { lt: latest.periodEnd },
      },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.revenue.groupBy({
      by: ["customerId"],
      where: {
        companyId,
        currency: latest.currency,
        occurredAt: { gte: latest.periodStart, lte: latest.periodEnd },
        customerId: { not: null },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const existingTypes = new Set(existingForSnapshot.map((a) => a.type));

  const hasRevenue = latestForCtx.revenueCents > 0;
  const expenseRatio = hasRevenue ? latestForCtx.expenseCents / latestForCtx.revenueCents : 0;
  const profitMarginBps = latestForCtx.profitMarginBps ?? null;
  const marginLow =
    profitMarginBps !== null && profitMarginBps <= env.ALERT_LOW_PROFIT_MARGIN_BPS_MAX;

  const prevRevenueCents = previousSnapshot ? centsFromPrisma(previousSnapshot.revenueCents) : 0;
  const hasPrevRevenue = prevRevenueCents > 0;
  const growthBps = hasPrevRevenue
    ? Math.round(((latestForCtx.revenueCents - prevRevenueCents) * 10000) / prevRevenueCents)
    : null;

  const totalCustomerRevenueCents = customerDependenceRows.reduce(
    (acc, r) => acc + centsFromPrisma(r._sum.amountCents),
    0,
  );

  const customerSorted = [...customerDependenceRows].sort(
    (a, b) => centsFromPrisma(b._sum.amountCents) - centsFromPrisma(a._sum.amountCents),
  );
  const top1RevenueCents = customerSorted[0]
    ? centsFromPrisma(customerSorted[0]._sum.amountCents)
    : 0;
  const top3RevenueCents = customerSorted
    .slice(0, 3)
    .reduce((acc, r) => acc + centsFromPrisma(r._sum.amountCents), 0);

  const activeCustomersCount = customerDependenceRows.length;

  const top1Share = totalCustomerRevenueCents > 0 ? top1RevenueCents / totalCustomerRevenueCents : 0;
  const top3Share = totalCustomerRevenueCents > 0 ? top3RevenueCents / totalCustomerRevenueCents : 0;

  const hhi =
    totalCustomerRevenueCents > 0
      ? customerSorted.reduce((acc, r) => {
          const share = centsFromPrisma(r._sum.amountCents) / totalCustomerRevenueCents;
          return acc + share * share;
        }, 0)
      : 0;

  const previousForCtx: DiagnosticsContext["previousSnapshot"] = previousSnapshot
    ? { id: previousSnapshot.id, revenueCents: centsFromPrisma(previousSnapshot.revenueCents) }
    : null;

  const ctx = {
    companyId,
    latest: latestForCtx,
    previousSnapshot: previousForCtx,
    expenseRatio,
    hasRevenue,
    profitMarginBps,
    marginLow,
    growthBps,
    hasPrevRevenue,
    customerDependence: {
      activeCustomersCount,
      totalCustomerRevenueCents,
      top1Share,
      top3Share,
      hhi,
    },
  } as unknown as DiagnosticsContext;

  type RuleDef = {
    type: Prisma.AlertCreateManyInput["type"];
    severity: Prisma.AlertCreateManyInput["severity"] | ((c: typeof ctx) => Prisma.AlertCreateManyInput["severity"]);
    title: string;
    message: string | ((c: typeof ctx) => string);
    predicate: (c: typeof ctx) => boolean;
    signals: (c: typeof ctx) => Record<string, unknown>;
  };

  // Alertas requeridas por categoría:
  // - riesgo financiero (FINANCIAL_RISK)
  // - caída de ventas (SALES_FALL)
  // - dependencia de clientes (CUSTOMER_DEPENDENCE)
  const rules: RuleDef[] = [
    {
      type: "FINANCIAL_RISK",
      title: "Riesgo financiero",
      predicate: (c) => {
        const highCond = c.latest.revenueCents <= 0 || c.latest.profitCents < 0 || c.expenseRatio >= 0.9;
        const medCond = c.marginLow || c.expenseRatio >= 0.75;
        const lowCond = c.hasRevenue && c.expenseRatio >= 0.65 && !c.marginLow;
        return highCond || medCond || lowCond;
      },
      severity: (c) => {
        const highCond = c.latest.revenueCents <= 0 || c.latest.profitCents < 0 || c.expenseRatio >= 0.9;
        const medCond = c.marginLow || c.expenseRatio >= 0.75;
        const lowCond = c.hasRevenue && c.expenseRatio >= 0.65 && !c.marginLow;
        return highCond ? "HIGH" : medCond ? "MEDIUM" : lowCond ? "LOW" : "LOW";
      },
      message: (c) => {
        const sev =
          c.latest.revenueCents <= 0 || c.latest.profitCents < 0
            ? "ingresos en riesgo / rentabilidad negativa"
            : c.expenseRatio >= 0.85
              ? "presión de costos"
              : "margen bajo / estructura sensible";
        return (
          `Señales financieras detectadas (${sev}). ` +
          `profitMargin=${c.profitMarginBps === null ? "—" : (c.profitMarginBps / 100).toFixed(2) + "%"} ` +
          `y expenseRatio=${(c.expenseRatio * 100).toFixed(1)}%.`
        );
      },
      signals: (c) => ({
        revenueCents: c.latest.revenueCents,
        profitCents: c.latest.profitCents,
        profitMarginBps: c.profitMarginBps,
        expenseRatio: c.expenseRatio,
      }),
    },
    {
      type: "SALES_FALL",
      title: "Caída de ventas",
      predicate: (c) => {
        const highCond = c.latest.revenueCents <= 0 || (c.growthBps !== null && c.growthBps <= -1000);
        const medCond = c.growthBps !== null && c.growthBps <= -500 && c.growthBps > -1000;
        const lowCond = c.growthBps !== null && c.growthBps <= -100 && c.growthBps > -500;
        return highCond || medCond || lowCond;
      },
      severity: (c) => {
        const highCond = c.latest.revenueCents <= 0 || (c.growthBps !== null && c.growthBps <= -1000);
        const medCond = c.growthBps !== null && c.growthBps <= -500 && c.growthBps > -1000;
        const lowCond = c.growthBps !== null && c.growthBps <= -100 && c.growthBps > -500;
        return highCond ? "HIGH" : medCond ? "MEDIUM" : lowCond ? "LOW" : "LOW";
      },
      message: (c) => {
        const g = c.growthBps === null ? null : c.growthBps / 100;
        return (
          `Los ingresos del período caen vs el anterior. ` +
          `growth=${g === null ? "—" : `${g.toFixed(2)}%`}%. ` +
          `Primero localiza dónde se pierde tracción (captación/conversión/retención).`
        );
      },
      signals: (c) => ({
        latestRevenueCents: c.latest.revenueCents,
        previousRevenueCents: c.previousSnapshot?.revenueCents ?? 0,
        growthBps: c.growthBps,
      }),
    },
    {
      type: "CUSTOMER_DEPENDENCE",
      title: "Dependencia de clientes",
      predicate: (c) => {
        const d = c.customerDependence;
        const highCond = d.top1Share >= 0.7 || d.hhi >= 0.5 || d.activeCustomersCount <= 3;
        const medCond = d.top1Share >= 0.6 || d.top3Share >= 0.85 || d.hhi >= 0.35;
        const lowCond = d.top1Share >= 0.45 || d.hhi >= 0.25 || d.activeCustomersCount <= 6;
        return c.latest.revenueCents > 0 && (highCond || medCond || lowCond) && d.totalCustomerRevenueCents > 0;
      },
      severity: (c) => {
        const d = c.customerDependence;
        const highCond = d.top1Share >= 0.7 || d.hhi >= 0.5 || d.activeCustomersCount <= 3;
        const medCond = d.top1Share >= 0.6 || d.top3Share >= 0.85 || d.hhi >= 0.35;
        const lowCond = d.top1Share >= 0.45 || d.hhi >= 0.25 || d.activeCustomersCount <= 6;
        return highCond ? "HIGH" : medCond ? "MEDIUM" : lowCond ? "LOW" : "LOW";
      },
      message: (c) => {
        const d = c.customerDependence;
        return (
          `Alta concentración de ingresos. top1 ${(d.top1Share * 100).toFixed(1)}%, ` +
          `top3 ${(d.top3Share * 100).toFixed(1)}% y HHI ${d.hhi.toFixed(3)}. ` +
          `Clientes activos generadores: ${d.activeCustomersCount}.`
        );
      },
      signals: (c) => {
        const d = c.customerDependence;
        return {
          activeCustomersCount: d.activeCustomersCount,
          totalCustomerRevenueCents: d.totalCustomerRevenueCents,
          top1Share: d.top1Share,
          top3Share: d.top3Share,
          hhi: d.hhi,
        };
      },
    },
  ];

  const findings = rules
    .filter((r) => r.predicate(ctx))
    .filter((r) => !existingTypes.has(r.type))
    .map((r) => ({
      type: r.type,
      severity: typeof r.severity === "function" ? r.severity(ctx) : r.severity,
      title: r.title,
      message: typeof r.message === "string" ? r.message : r.message(ctx),
      signals: r.signals(ctx),
    }));

  const toCreate = findings.map(
    (f): Prisma.AlertCreateManyInput => ({
      companyId,
      snapshotId: latest.id,
      type: f.type,
      severity: f.severity,
      title: f.title,
      message: f.message,
    }),
  );

  const createdAlerts = await prisma.$transaction(async (tx) => {
    if (toCreate.length === 0) return { createdAlerts: [], recsCreated: 0 };

    const created = await Promise.all(
      toCreate.map((data) =>
        tx.alert.create({
          data,
          select: { id: true, type: true },
        }),
      ),
    );

    const existingRecs = await tx.recommendation.findMany({
      where: { alertId: { in: created.map((a) => a.id) } },
      select: { alertId: true },
    });
    const existingRecSet = new Set(existingRecs.map((r) => r.alertId));

    const recsToCreate: Prisma.RecommendationCreateManyInput[] = created
      .filter((a) => !existingRecSet.has(a.id))
      .map((a) => {
        const rec = buildRecommendationForAlertType({ alertType: a.type, ctx });
        return {
          companyId,
          alertId: a.id,
          title: rec.title,
          rationale: rec.rationale,
          actionPlan: rec.actionPlan,
          expectedImpactCents:
            rec.expectedImpactCents == null ? null : BigInt(rec.expectedImpactCents),
          sourceOnboardingSessionId: rec.sourceOnboardingSessionId,
        };
      });

    if (recsToCreate.length > 0) {
      await tx.recommendation.createMany({ data: recsToCreate });
    }

    return { createdAlerts: created, recsCreated: recsToCreate.length };
  });

  return {
    created: createdAlerts.createdAlerts.length,
    recsCreated: createdAlerts.recsCreated,
    snapshotId: latest.id,
    findings,
  };
}

