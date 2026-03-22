import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";
import type { Prisma } from "@/src/generated/prisma";

export type BusinessDiagnosisItem = {
  alertId: string;
  alertType: Prisma.AlertCreateManyInput["type"];
  severity: Prisma.AlertCreateManyInput["severity"];
  status: Prisma.AlertCreateManyInput["status"];
  createdAt: Date;

  diagnostico: string;
  causa: string;
  impactoCents: number | null;
  moneda: string;
  recomendacion: string;
};

async function getBusinessDiagnosisForLatestSnapshotUncached(params: {
  companyId: string;
  take?: number;
}): Promise<BusinessDiagnosisItem[]> {
  const prisma = getPrisma();

  const latest = await prisma.metricSnapshot.findFirst({
    where: { companyId: params.companyId },
    orderBy: { periodEnd: "desc" },
    select: { id: true, currency: true },
  });

  if (!latest) return [];

  const alerts = await prisma.alert.findMany({
    where: { companyId: params.companyId, snapshotId: latest.id },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 3,
    select: {
      id: true,
      type: true,
      severity: true,
      status: true,
      title: true,
      message: true,
      createdAt: true,
    },
  });

  if (alerts.length === 0) return [];

  const alertIds = alerts.map((a) => a.id);

  const recs = await prisma.recommendation.findMany({
    where: { companyId: params.companyId, alertId: { in: alertIds } },
    select: {
      alertId: true,
      title: true,
      rationale: true,
      actionPlan: true,
      expectedImpactCents: true,
    },
  });

  const recByAlertId = new Map<string, (typeof recs)[number]>();
  for (const r of recs) {
    if (!r.alertId) continue;
    recByAlertId.set(r.alertId, r);
  }

  return alerts.map((a) => {
    const rec = recByAlertId.get(a.id);
    return {
      alertId: a.id,
      alertType: a.type,
      severity: a.severity,
      status: a.status,
      createdAt: a.createdAt,

      diagnostico: a.title,
      causa: a.message,
      impactoCents:
        rec?.expectedImpactCents == null ? null : centsFromPrisma(rec.expectedImpactCents),
      moneda: latest.currency,
      recomendacion: rec?.actionPlan ?? "",
    };
  });
}

const cache = createTtlCache<BusinessDiagnosisItem[]>({ ttlMs: 15_000 });
const inFlight = new Map<string, Promise<BusinessDiagnosisItem[]>>();

export async function getBusinessDiagnosisForLatestSnapshot(params: {
  companyId: string;
  take?: number;
}): Promise<BusinessDiagnosisItem[]> {
  const key = `businessDiagnosis|${params.companyId}|${params.take ?? 3}`;
  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache,
    inFlight,
    factory: async () => getBusinessDiagnosisForLatestSnapshotUncached(params),
  });
}

