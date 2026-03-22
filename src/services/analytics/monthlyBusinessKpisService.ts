import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { HttpError } from "@/src/lib/errors/HttpError";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

export type MonthlyKpiPoint = {
  bucket: string; // YYYY-MM (UTC)
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
  marginBps: number | null; // profit / revenue
};

export type CurrencyMonthlyKpis = {
  currency: string;
  series: MonthlyKpiPoint[];
  latest: MonthlyKpiPoint | null;
  previous: MonthlyKpiPoint | null;
  growthBps: number | null; // (latest - previous) / previous
};

export type MonthlyBusinessKpisResponse = {
  startDate: Date;
  endDate: Date;
  activeCustomersCount: number;
  byCurrency: CurrencyMonthlyKpis[];
};

function toUtcMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function firstDayOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function listMonthBuckets(start: Date, end: Date): string[] {
  const buckets: string[] = [];
  let cur = firstDayOfUtcMonth(start);
  const last = firstDayOfUtcMonth(end);
  while (cur.getTime() <= last.getTime()) {
    buckets.push(toUtcMonthKey(cur));
    cur = addMonthsUtc(cur, 1);
  }
  return buckets;
}

function computeMarginBps(revenueCents: number, expenseCents: number): number | null {
  const profitCents = revenueCents - expenseCents;
  return revenueCents > 0 ? Math.round((profitCents * 10000) / revenueCents) : null;
}

function computeGrowthBps(latestRevenueCents: number, previousRevenueCents: number): number | null {
  if (previousRevenueCents <= 0) return null;
  return Math.round(((latestRevenueCents - previousRevenueCents) * 10000) / previousRevenueCents);
}

export async function computeMonthlyBusinessKpis(params: {
  companyId: string;
  monthsBack?: number;
  activeDays?: number;
  endDate?: Date;
}): Promise<MonthlyBusinessKpisResponse> {
  const cache = monthlyKpisCache;
  const inFlight = monthlyKpisInFlight;

  const monthsBack = params.monthsBack ?? 6;
  const activeDays = params.activeDays ?? 30;
  const endDate = params.endDate ?? new Date();

  const endDateDayKey = endDate.toISOString().slice(0, 10);
  const key = [params.companyId, String(monthsBack), String(activeDays), endDateDayKey].join("|");

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 60_000,
    cache,
    inFlight,
    factory: async () => {
      const prisma = getPrisma();

      if (monthsBack < 3) {
        throw new HttpError("monthsBack muy bajo", 400, "INVALID_MONTHS_BACK");
      }

      const startDate = addMonthsUtc(firstDayOfUtcMonth(endDate), -(monthsBack - 1));

      if (endDate.getTime() <= startDate.getTime()) {
        throw new HttpError("Rango inválido", 400, "INVALID_RANGE");
      }

      const activeFrom = new Date(
        endDate.getTime() - activeDays * 24 * 60 * 60 * 1000,
      );

      const [revenues, expenses] = await Promise.all([
        prisma.revenue.findMany({
          where: {
            companyId: params.companyId,
            occurredAt: { gte: startDate, lte: endDate },
          },
          select: {
            occurredAt: true,
            amountCents: true,
            currency: true,
            customerId: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            companyId: params.companyId,
            occurredAt: { gte: startDate, lte: endDate },
          },
          select: {
            occurredAt: true,
            amountCents: true,
            currency: true,
          },
        }),
      ]);

      // Clientes activos = con al menos una compra en las últimas `activeDays` (ingresos con customerId)
      const activeCustomerIds = new Set<string>();
      for (const r of revenues) {
        if (!r.customerId) continue;
        if (r.occurredAt.getTime() >= activeFrom.getTime()) activeCustomerIds.add(r.customerId);
      }

      const currencies = new Set<string>();
      const revenuesByCurrencyMonth = new Map<string, Map<string, { revenueCents: number }>>();
      const expensesByCurrencyMonth = new Map<
        string,
        Map<string, { expenseCents: number }>
      >();

      for (const r of revenues) {
        const cur = r.currency;
        currencies.add(cur);
        const month = toUtcMonthKey(r.occurredAt);
        const perCur =
          revenuesByCurrencyMonth.get(cur) ??
          new Map<string, { revenueCents: number }>();
        const existing = perCur.get(month) ?? { revenueCents: 0 };
        existing.revenueCents += centsFromPrisma(r.amountCents);
        perCur.set(month, existing);
        revenuesByCurrencyMonth.set(cur, perCur);
      }

      for (const x of expenses) {
        const cur = x.currency;
        currencies.add(cur);
        const month = toUtcMonthKey(x.occurredAt);
        const perCur =
          expensesByCurrencyMonth.get(cur) ??
          new Map<string, { expenseCents: number }>();
        const existing = perCur.get(month) ?? { expenseCents: 0 };
        existing.expenseCents += centsFromPrisma(x.amountCents);
        perCur.set(month, existing);
        expensesByCurrencyMonth.set(cur, perCur);
      }

      const monthBuckets = listMonthBuckets(startDate, endDate);

      const byCurrency: CurrencyMonthlyKpis[] = Array.from(currencies).map((currency) => {
        const series: MonthlyKpiPoint[] = monthBuckets.map((bucket) => {
          const revenueCents =
            revenuesByCurrencyMonth.get(currency)?.get(bucket)?.revenueCents ?? 0;
          const expenseCents =
            expensesByCurrencyMonth.get(currency)?.get(bucket)?.expenseCents ?? 0;
          const profitCents = revenueCents - expenseCents;
          return {
            bucket,
            revenueCents,
            expenseCents,
            profitCents,
            marginBps: computeMarginBps(revenueCents, expenseCents),
          };
        });

        const latest = series.length ? series[series.length - 1] : null;
        const previous = series.length >= 2 ? series[series.length - 2] : null;

        const growthBps =
          latest && previous
            ? computeGrowthBps(latest.revenueCents, previous.revenueCents)
            : null;

        return {
          currency,
          series,
          latest,
          previous,
          growthBps,
        };
      });

      // orden: mayor ingreso en el último mes
      byCurrency.sort(
        (a, b) => (b.latest?.revenueCents ?? 0) - (a.latest?.revenueCents ?? 0),
      );

      return {
        startDate,
        endDate,
        activeCustomersCount: activeCustomerIds.size,
        byCurrency,
      };
    },
  });
}

const monthlyKpisCache = createTtlCache<MonthlyBusinessKpisResponse>({ ttlMs: 60_000 });
const monthlyKpisInFlight = new Map<string, Promise<MonthlyBusinessKpisResponse>>();

