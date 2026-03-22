import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

export type RecommendationCard = {
  id: string;
  alertType: string | null;
  problema: string;
  explicacion: string;
  accion: string;
  impacto: number | null;
  currency: string;
  createdAt: Date;
};

async function listRecommendationsForLatestSnapshotUncached(params: {
  companyId: string;
  take?: number;
}): Promise<RecommendationCard[]> {
  const prisma = getPrisma();
  const latest = await prisma.metricSnapshot.findFirst({
    where: { companyId: params.companyId },
    orderBy: { periodEnd: "desc" },
    select: { id: true, currency: true },
  });

  if (!latest) return [];

  const recs = await prisma.recommendation.findMany({
    where: {
      companyId: params.companyId,
      alert: {
        snapshotId: latest.id,
      },
    },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 4,
    select: {
      id: true,
      title: true,
      rationale: true,
      actionPlan: true,
      expectedImpactCents: true,
      createdAt: true,
      alert: {
        select: { type: true },
      },
    },
  });

  return recs.map((r) => ({
    id: r.id,
    alertType: r.alert?.type ?? null,
    problema: r.title,
    explicacion: r.rationale,
    accion: r.actionPlan,
    impacto: r.expectedImpactCents == null ? null : centsFromPrisma(r.expectedImpactCents),
    currency: latest.currency,
    createdAt: r.createdAt,
  }));
}

const listRecsCache = createTtlCache<RecommendationCard[]>({ ttlMs: 15_000 });
const listRecsInFlight = new Map<string, Promise<RecommendationCard[]>>();

export async function listRecommendationsForLatestSnapshot(params: {
  companyId: string;
  take?: number;
}): Promise<RecommendationCard[]> {
  const key = `listRecommendationsForLatestSnapshot|${params.companyId}|${params.take ?? 4}`;

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: listRecsCache,
    inFlight: listRecsInFlight,
    factory: async () => listRecommendationsForLatestSnapshotUncached(params),
  });
}

