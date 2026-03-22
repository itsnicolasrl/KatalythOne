import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { mapSnapshotCentsFields, prismaSumToBigInt } from "@/src/lib/money/centsBigInt";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

async function getLatestMetricSnapshotUncached(companyId: string) {
  const prisma = getPrisma();
  const row = await prisma.metricSnapshot.findFirst({
    where: { companyId },
    orderBy: { periodEnd: "desc" },
  });
  return row ? mapSnapshotCentsFields(row) : null;
}

const latestSnapshotCache = createTtlCache<
  Awaited<ReturnType<typeof getLatestMetricSnapshotUncached>>
>({ ttlMs: 15_000 });
const latestSnapshotInFlight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getLatestMetricSnapshotUncached>>>
>();

export async function getLatestMetricSnapshot(companyId: string) {
  const key = `getLatestMetricSnapshot|${companyId}`;
  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: latestSnapshotCache,
    inFlight: latestSnapshotInFlight,
    factory: async () => getLatestMetricSnapshotUncached(companyId),
  });
}

export async function listMetricSnapshots(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  const rows = await prisma.metricSnapshot.findMany({
    where: { companyId: params.companyId },
    orderBy: { periodEnd: "desc" },
    take: params.take ?? 50,
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      currency: true,
      revenueCents: true,
      expenseCents: true,
      profitCents: true,
      profitMarginBps: true,
      createdAt: true,
    },
  });
  return rows.map(mapSnapshotCentsFields);
}

export async function getMetricSnapshot(params: { companyId: string; snapshotId: string }) {
  const prisma = getPrisma();
  const snapshot = await prisma.metricSnapshot.findFirst({
    where: { companyId: params.companyId, id: params.snapshotId },
  });
  if (!snapshot) throw new HttpError("Snapshot no encontrado", 404, "METRIC_SNAPSHOT_NOT_FOUND");
  return mapSnapshotCentsFields(snapshot);
}

export async function deleteMetricSnapshot(params: { companyId: string; snapshotId: string }) {
  const prisma = getPrisma();
  const count = await prisma.metricSnapshot.deleteMany({
    where: { companyId: params.companyId, id: params.snapshotId },
  });
  if (count.count === 0) throw new HttpError("Snapshot no encontrado", 404, "METRIC_SNAPSHOT_NOT_FOUND");
  return { ok: true };
}

/** Crea snapshot con totales en BIGINT; devuelve fila cruda (para recomputar). */
async function createComputedSnapshotRow(params: {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const prisma = getPrisma();
  const revenue = await prisma.revenue.findFirst({
    where: { companyId: params.companyId, occurredAt: { gte: params.periodStart, lte: params.periodEnd } },
    select: { currency: true },
    orderBy: { occurredAt: "asc" },
  });

  const expense = await prisma.expense.findFirst({
    where: { companyId: params.companyId, occurredAt: { gte: params.periodStart, lte: params.periodEnd } },
    select: { currency: true },
    orderBy: { occurredAt: "asc" },
  });

  const currency = revenue?.currency ?? expense?.currency;
  if (!currency) {
    throw new HttpError("No hay datos de ingresos o gastos para ese período", 400, "NO_DATA");
  }

  const revenueSum = await prisma.revenue.aggregate({
    where: {
      companyId: params.companyId,
      occurredAt: { gte: params.periodStart, lte: params.periodEnd },
      currency,
    },
    _sum: { amountCents: true },
  });

  const expenseSum = await prisma.expense.aggregate({
    where: {
      companyId: params.companyId,
      occurredAt: { gte: params.periodStart, lte: params.periodEnd },
      currency,
    },
    _sum: { amountCents: true },
  });

  const revenueCents = prismaSumToBigInt(revenueSum._sum.amountCents);
  const expenseCents = prismaSumToBigInt(expenseSum._sum.amountCents);
  const profitCents = revenueCents - expenseCents;

  const profitMarginBps =
    revenueCents > BigInt(0)
      ? Number((profitCents * BigInt(10000)) / revenueCents)
      : null;

  return prisma.metricSnapshot.create({
    data: {
      companyId: params.companyId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      currency,
      revenueCents,
      expenseCents,
      profitCents,
      profitMarginBps,
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      currency: true,
      revenueCents: true,
      expenseCents: true,
      profitCents: true,
      profitMarginBps: true,
    },
  });
}

export async function computeAndStoreSnapshot(params: {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const row = await createComputedSnapshotRow(params);
  return mapSnapshotCentsFields(row);
}

export async function recomputeMetricSnapshot(params: {
  companyId: string;
  snapshotId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const prisma = getPrisma();

  const existing = await prisma.metricSnapshot.findFirst({
    where: { companyId: params.companyId, id: params.snapshotId },
  });
  if (!existing) throw new HttpError("Snapshot no encontrado", 404, "METRIC_SNAPSHOT_NOT_FOUND");

  const recomputed = await createComputedSnapshotRow({
    companyId: params.companyId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  });

  await prisma.metricSnapshot.update({
    where: { id: existing.id },
    data: {
      currency: recomputed.currency,
      revenueCents: recomputed.revenueCents,
      expenseCents: recomputed.expenseCents,
      profitCents: recomputed.profitCents,
      profitMarginBps: recomputed.profitMarginBps,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    },
  });

  await prisma.metricSnapshot.delete({ where: { id: recomputed.id } });

  const final = await prisma.metricSnapshot.findFirst({
    where: { id: existing.id, companyId: params.companyId },
  });
  if (!final) throw new HttpError("Snapshot no encontrado", 404, "METRIC_SNAPSHOT_NOT_FOUND");
  return mapSnapshotCentsFields(final);
}
