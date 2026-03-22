import { getPrisma } from "@/src/db/prisma";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

async function getRecentAlertsUncached(params: { companyId: string; take: number }) {
  const prisma = getPrisma();
  return prisma.alert.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    take: params.take,
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
}

const countOpenAlertsCache = createTtlCache<number>({ ttlMs: 15_000 });
const countOpenAlertsInFlight = new Map<string, Promise<number>>();

export async function countOpenAlerts(companyId: string) {
  const key = `countOpenAlerts|${companyId}`;

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: countOpenAlertsCache,
    inFlight: countOpenAlertsInFlight,
    factory: async () => {
      const prisma = getPrisma();
      return prisma.alert.count({
        where: { companyId, status: "OPEN" },
      });
    },
  });
}

const recentAlertsCache = createTtlCache<
  Awaited<ReturnType<typeof getRecentAlertsUncached>>
>({ ttlMs: 15_000 });
const recentAlertsInFlight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getRecentAlertsUncached>>>
>();

export async function getRecentAlerts(params: { companyId: string; take: number }) {
  const key = `getRecentAlerts|${params.companyId}|${params.take}`;

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: recentAlertsCache,
    inFlight: recentAlertsInFlight,
    factory: async () => getRecentAlertsUncached(params),
  });
}

const severityOrder: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** Alertas abiertas para informes (ordenadas por severidad y fecha). */
export async function listOpenAlertsForCompany(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  const take = params.take ?? 50;
  const rows = await prisma.alert.findMany({
    where: { companyId: params.companyId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: take * 2,
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
  return rows
    .sort((a, b) => {
      const da = severityOrder[a.severity] ?? 0;
      const db = severityOrder[b.severity] ?? 0;
      if (db !== da) return db - da;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, take);
}

