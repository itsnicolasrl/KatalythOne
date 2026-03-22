import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { HttpError } from "@/src/lib/errors/HttpError";

export type CustomerValueByCurrency = {
  currency: string;
  totalAmountCents: number;
  revenueCount: number;
  lastOccurredAt: Date | null;
};

export type CustomerValueResult = {
  customerId: string;
  totalsByCurrency: CustomerValueByCurrency[];
};

export type CustomerRevenueHistoryItem = {
  id: string;
  occurredAt: Date;
  amountCents: number;
  currency: string;
  description: string | null;
  createdAt: Date;
};

export async function getCustomerValue(params: {
  companyId: string;
  customerId: string;
}): Promise<CustomerValueResult> {
  const prisma = getPrisma();

  const customerExists = await prisma.customer.findFirst({
    where: { companyId: params.companyId, id: params.customerId },
    select: { id: true },
  });
  if (!customerExists) {
    throw new HttpError("Cliente no encontrado", 404, "CUSTOMER_NOT_FOUND");
  }

  const byCurrency = await prisma.revenue.groupBy({
    by: ["customerId", "currency"],
    where: {
      companyId: params.companyId,
      customerId: params.customerId,
    },
    _sum: { amountCents: true },
    _count: { _all: true },
    _max: { occurredAt: true },
  });

  const totalsByCurrency: CustomerValueByCurrency[] = byCurrency.map((row) => ({
    currency: row.currency,
    totalAmountCents: centsFromPrisma(row._sum.amountCents),
    revenueCount: row._count._all,
    lastOccurredAt: row._max.occurredAt ?? null,
  }));

  return { customerId: params.customerId, totalsByCurrency };
}

export async function getCustomerRevenueHistory(params: {
  companyId: string;
  customerId: string;
  take?: number;
}): Promise<CustomerRevenueHistoryItem[]> {
  const prisma = getPrisma();
  const take = params.take ?? 50;

  const customerExists = await prisma.customer.findFirst({
    where: { companyId: params.companyId, id: params.customerId },
    select: { id: true },
  });
  if (!customerExists) {
    throw new HttpError("Cliente no encontrado", 404, "CUSTOMER_NOT_FOUND");
  }

  const rows = await prisma.revenue.findMany({
    where: { companyId: params.companyId, customerId: params.customerId },
    orderBy: { occurredAt: "desc" },
    take,
    select: {
      id: true,
      occurredAt: true,
      amountCents: true,
      currency: true,
      description: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({ ...row, amountCents: centsFromPrisma(row.amountCents) }));
}

