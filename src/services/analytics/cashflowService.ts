import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

export type CashflowSummaryByCurrency = {
  currency: string;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  marginBps: number | null;
};

export type CashflowSeriesPoint = {
  bucket: string; // YYYY-MM-DD (UTC)
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  marginBps: number | null;
};

export type CashflowSeriesByCurrency = Record<string, CashflowSeriesPoint[]>;

export type CashflowResponse = {
  startDate: Date;
  endDate: Date;
  summaryByCurrency: CashflowSummaryByCurrency[];
  seriesByCurrency: CashflowSeriesByCurrency;
};

function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeMarginBps(revenueCents: number, expenseCents: number): number | null {
  const profitCents = revenueCents - expenseCents;
  return revenueCents > 0 ? Math.round((profitCents * 10000) / revenueCents) : null;
}

export async function computeCashflow(params: {
  companyId: string;
  startDate: Date;
  endDate: Date;
  bucket: "day";
}): Promise<CashflowResponse> {
  const cache = cashflowCache;
  const inFlight = cashflowInFlight;
  const key = [
    params.companyId,
    params.bucket,
    params.startDate.toISOString().slice(0, 10),
    params.endDate.toISOString().slice(0, 10),
  ].join("|");

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 60_000,
    cache,
    inFlight,
    factory: async () => {
      const prisma = getPrisma();

      if (params.endDate.getTime() <= params.startDate.getTime()) {
        throw new HttpError(
          "Rango inválido: endDate debe ser > startDate",
          400,
          "INVALID_RANGE",
        );
      }

      // Por simplicidad mantenemos bucket por día.
      const [revenues, expenses] = await Promise.all([
        prisma.revenue.findMany({
          where: {
            companyId: params.companyId,
            occurredAt: { gte: params.startDate, lte: params.endDate },
          },
          select: { occurredAt: true, amountCents: true, currency: true },
        }),
        prisma.expense.findMany({
          where: {
            companyId: params.companyId,
            occurredAt: { gte: params.startDate, lte: params.endDate },
          },
          select: { occurredAt: true, amountCents: true, currency: true },
        }),
      ]);

      const summaryMap = new Map<string, { revenueCents: number; expenseCents: number }>();
      const seriesMap = new Map<
        string,
        Map<string, { revenueCents: number; expenseCents: number }>
      >();

      for (const r of revenues) {
        const cur = r.currency;
        const key = toUtcDateKey(r.occurredAt);

        const s = summaryMap.get(cur) ?? { revenueCents: 0, expenseCents: 0 };
        s.revenueCents += centsFromPrisma(r.amountCents);
        summaryMap.set(cur, s);

        const perCur =
          seriesMap.get(cur) ??
          new Map<string, { revenueCents: number; expenseCents: number }>();
        const perDay = perCur.get(key) ?? { revenueCents: 0, expenseCents: 0 };
        perDay.revenueCents += centsFromPrisma(r.amountCents);
        perCur.set(key, perDay);
        seriesMap.set(cur, perCur);
      }

      for (const x of expenses) {
        const cur = x.currency;
        const key = toUtcDateKey(x.occurredAt);

        const s = summaryMap.get(cur) ?? { revenueCents: 0, expenseCents: 0 };
        s.expenseCents += centsFromPrisma(x.amountCents);
        summaryMap.set(cur, s);

        const perCur =
          seriesMap.get(cur) ??
          new Map<string, { revenueCents: number; expenseCents: number }>();
        const perDay = perCur.get(key) ?? { revenueCents: 0, expenseCents: 0 };
        perDay.expenseCents += centsFromPrisma(x.amountCents);
        perCur.set(key, perDay);
        seriesMap.set(cur, perCur);
      }

      const summaryByCurrency: CashflowSummaryByCurrency[] = Array.from(summaryMap.entries()).map(
        ([currency, totals]) => {
          const marginBps = computeMarginBps(totals.revenueCents, totals.expenseCents);
          return {
            currency,
            revenueCents: totals.revenueCents,
            expenseCents: totals.expenseCents,
            netCents: totals.revenueCents - totals.expenseCents,
            marginBps,
          };
        },
      );

      // Serie ordenada por bucket.
      const seriesByCurrency: CashflowSeriesByCurrency = {};
      for (const [currency, perDayMap] of seriesMap.entries()) {
        const points: CashflowSeriesPoint[] = Array.from(perDayMap.entries())
          .map(([bucket, totals]) => {
            const marginBps = computeMarginBps(
              totals.revenueCents,
              totals.expenseCents,
            );
            return {
              bucket,
              revenueCents: totals.revenueCents,
              expenseCents: totals.expenseCents,
              netCents: totals.revenueCents - totals.expenseCents,
              marginBps,
            };
          })
          .sort((a, b) => (a.bucket < b.bucket ? -1 : 1));
        seriesByCurrency[currency] = points;
      }

      return {
        startDate: params.startDate,
        endDate: params.endDate,
        summaryByCurrency,
        seriesByCurrency,
      };
    },
  });
}

const cashflowCache = createTtlCache<CashflowResponse>({ ttlMs: 60_000 });
const cashflowInFlight = new Map<string, Promise<CashflowResponse>>();

