import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { HttpError } from "@/src/lib/errors/HttpError";
import type { SimulationScenarioType } from "@/src/generated/prisma";

export type SimulationInputs = {
  // Ajustes % sobre el baseline del último snapshot.
  priceIncreasePercent: number; // ej 10 => +10%
  expenseIncreasePercent: number; // ej 5 => +5%
  newCustomersCount: number; // cantidad de nuevos clientes
};

export type SimulationImpactFinancial = {
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

export type SimulationImpactOperational = {
  loadScore: number; // 0..100
  loadLevel: "bajo" | "medio" | "alto";
  expectedAreas: string[];
  notes: string;
};

export type SimulationResponse = {
  simulationRunId: string;
  scenarioType: SimulationScenarioType;
  inputs: SimulationInputs;
  impactFinancial: SimulationImpactFinancial;
  impactOperational: SimulationImpactOperational;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function computeMarginBps(revenueCents: number, expenseCents: number) {
  const profitCents = revenueCents - expenseCents;
  return revenueCents > 0 ? Math.round((profitCents * 10000) / revenueCents) : null;
}

export async function simulateGrowthBundle(params: {
  companyId: string;
  inputs: SimulationInputs;
  createdByUserId?: string | null;
}): Promise<SimulationResponse> {
  const prisma = getPrisma();

  const latest = await prisma.metricSnapshot.findFirst({
    where: { companyId: params.companyId },
    orderBy: { periodEnd: "desc" },
  });

  if (!latest) throw new HttpError("No hay snapshots para simular", 400, "NO_SNAPSHOT");

  const priceIncreasePercent = params.inputs.priceIncreasePercent;
  const expenseIncreasePercent = params.inputs.expenseIncreasePercent;
  const newCustomersCount = params.inputs.newCustomersCount;

  if (!Number.isFinite(priceIncreasePercent) || priceIncreasePercent < -80 || priceIncreasePercent > 200) {
    throw new HttpError("priceIncreasePercent inválido", 400, "INVALID_PRICE_INCREASE");
  }
  if (!Number.isFinite(expenseIncreasePercent) || expenseIncreasePercent < -80 || expenseIncreasePercent > 200) {
    throw new HttpError("expenseIncreasePercent inválido", 400, "INVALID_EXPENSE_INCREASE");
  }
  if (!Number.isFinite(newCustomersCount) || newCustomersCount < 0 || newCustomersCount > 100000) {
    throw new HttpError("newCustomersCount inválido", 400, "INVALID_NEW_CUSTOMERS");
  }

  // Para estimar ingresos por nuevos clientes usamos el baseline de ingresos que ya están asociados a customerId.
  const customerRevenue = await prisma.revenue.groupBy({
    by: ["customerId"],
    where: {
      companyId: params.companyId,
      currency: latest.currency,
      occurredAt: { gte: latest.periodStart, lte: latest.periodEnd },
      customerId: { not: null },
    },
    _sum: { amountCents: true },
  });

  const revenueWithCustomerCents = customerRevenue.reduce(
    (acc, r) => acc + centsFromPrisma(r._sum.amountCents),
    0,
  );
  const activeCustomersCount = customerRevenue.length;

  const avgRevenuePerCustomerCents =
    activeCustomersCount > 0 ? revenueWithCustomerCents / activeCustomersCount : null;

  const baselineRevenueCents = centsFromPrisma(latest.revenueCents);
  const baselineExpenseCents = centsFromPrisma(latest.expenseCents);
  const baselineProfitCents = baselineRevenueCents - baselineExpenseCents;
  const baselineProfitMarginBps = latest.profitMarginBps ?? null;

  const deltaRevenueFromPrices = Math.round(
    baselineRevenueCents * (priceIncreasePercent / 100),
  );
  const deltaExpenseFromCosts = Math.round(
    baselineExpenseCents * (expenseIncreasePercent / 100),
  );

  const deltaRevenueFromNewCustomers =
    avgRevenuePerCustomerCents === null
      ? 0
      : Math.round(avgRevenuePerCustomerCents * newCustomersCount);

  const projectedRevenueCents = baselineRevenueCents + deltaRevenueFromPrices + deltaRevenueFromNewCustomers;
  const projectedExpenseCents = baselineExpenseCents + deltaExpenseFromCosts;
  const projectedProfitCents = projectedRevenueCents - projectedExpenseCents;
  const projectedProfitMarginBps = computeMarginBps(projectedRevenueCents, projectedExpenseCents);

  const deltaRevenueCents = projectedRevenueCents - baselineRevenueCents;
  const deltaExpenseCents = projectedExpenseCents - baselineExpenseCents;
  const deltaProfitCents = projectedProfitCents - baselineProfitCents;

  const baselineProfitMarginBpsSafe = baselineProfitMarginBps ?? null;
  const deltaProfitMarginBps =
    baselineProfitMarginBpsSafe === null || projectedProfitMarginBps === null
      ? null
      : projectedProfitMarginBps - baselineProfitMarginBpsSafe;

  const scenarioType: SimulationScenarioType =
    priceIncreasePercent !== 0 ? "PRICE_CHANGE" : expenseIncreasePercent !== 0 ? "COST_INCREASE" : "NEW_PRODUCT";

  // Impacto operativo: score por "stress" relativo de ingresos/costos + carga por nuevos clientes.
  const relRevenueStress = clamp(
    Math.abs(deltaRevenueCents) / Math.max(1, baselineRevenueCents),
    0,
    1.5,
  );
  const relExpenseStress = clamp(
    Math.abs(deltaExpenseCents) / Math.max(1, baselineExpenseCents),
    0,
    1.5,
  );
  const relCustomerStress = clamp(
    newCustomersCount / Math.max(1, activeCustomersCount),
    0,
    2,
  );

  const loadScore = clamp(Math.round(relRevenueStress * 50 + relExpenseStress * 30 + relCustomerStress * 20), 0, 100);
  const loadLevel: SimulationImpactOperational["loadLevel"] =
    loadScore >= 70 ? "alto" : loadScore >= 40 ? "medio" : "bajo";

  const expectedAreas = [
    newCustomersCount > 0 ? "Comercial/CS (onboarding de clientes)" : null,
    priceIncreasePercent > 0 ? "Ventas (nueva propuesta de valor/precios)" : null,
    expenseIncreasePercent > 0 ? "Operaciones/Finanzas (ejecución y control de costos)" : null,
  ].filter((x): x is string => x !== null);

  const notes =
    loadLevel === "alto"
      ? "La combinación de cambios incrementa presión operativa: prioriza capacidad, seguimiento y control de costos mientras ejecutas el ajuste comercial."
      : loadLevel === "medio"
        ? "Hay presión operativa moderada: asegúrate de actualizar procesos y KPIs para evitar desvíos en margen y ejecución."
        : "La carga operativa estimada es baja: el cambio debería ser absorbible con seguimiento estándar y control de variaciones.";

  const impactFinancial: SimulationImpactFinancial = {
    currency: latest.currency,
    baselineRevenueCents,
    baselineExpenseCents,
    baselineProfitCents,
    baselineProfitMarginBps: baselineProfitMarginBpsSafe,
    projectedRevenueCents,
    projectedExpenseCents,
    projectedProfitCents,
    projectedProfitMarginBps,
    deltaRevenueCents,
    deltaExpenseCents,
    deltaProfitCents,
    deltaProfitMarginBps,
  };

  const impactOperational: SimulationImpactOperational = {
    loadScore,
    loadLevel,
    expectedAreas,
    notes,
  };

  const created = await prisma.simulationRun.create({
    data: {
      companyId: params.companyId,
      createdByUserId: params.createdByUserId ?? null,
      scenarioType,
      parameters: {
        inputs: params.inputs,
        baselineSnapshotId: latest.id,
        avgRevenuePerCustomerCents,
        activeCustomersCount,
      },
      projection: {
        impactFinancial,
        impactOperational,
        currency: latest.currency,
      },
    },
    select: { id: true },
  });

  return {
    simulationRunId: created.id,
    scenarioType,
    inputs: params.inputs,
    impactFinancial,
    impactOperational,
  };
}

