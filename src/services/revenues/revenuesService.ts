import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { centsFromPrisma, centsToBigInt, nullableCentsToBigInt } from "@/src/lib/money/centsBigInt";
import { sanitizeText } from "@/src/lib/sanitize";

export type RevenueCreateInput = {
  companyId: string;
  customerId?: string | null;
  occurredAt: Date;
  amountCents: number;
  currency: string;
  description?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  channel?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
};

export type RevenueUpdateInput = {
  customerId?: string | null;
  occurredAt?: Date;
  amountCents?: number;
  currency?: string;
  description?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  channel?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
};

export function moneyToCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new HttpError("Monto inválido", 400, "MONEY_INVALID");
  return Math.round(amount * 100);
}

function normalizeCurrency(currency: string): string {
  const cur = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cur)) throw new HttpError("Moneda inválida (ISO 4217)", 400, "CURRENCY_INVALID");
  return cur;
}

function mapRevenueRow<
  T extends { amountCents: bigint | number; unitPriceCents: bigint | number | null },
>(row: T) {
  return {
    ...row,
    amountCents: centsFromPrisma(row.amountCents),
    unitPriceCents: row.unitPriceCents == null ? null : centsFromPrisma(row.unitPriceCents),
  };
}

export async function listRevenues(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  const rows = await prisma.revenue.findMany({
    where: { companyId: params.companyId },
    orderBy: { occurredAt: "desc" },
    take: params.take ?? 100,
    select: {
      id: true,
      occurredAt: true,
      amountCents: true,
      currency: true,
      description: true,
      paymentMethod: true,
      reference: true,
      channel: true,
      quantity: true,
      unitPriceCents: true,
      customerId: true,
      customer: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
  return rows.map(mapRevenueRow);
}

export async function getRevenue(params: { companyId: string; revenueId: string }) {
  const prisma = getPrisma();
  const revenue = await prisma.revenue.findFirst({
    where: { companyId: params.companyId, id: params.revenueId },
  });
  if (!revenue) throw new HttpError("Venta no encontrada", 404, "REVENUE_NOT_FOUND");
  return mapRevenueRow(revenue);
}

export async function createRevenue(input: RevenueCreateInput) {
  const prisma = getPrisma();
  if (input.amountCents <= 0) throw new HttpError("Monto debe ser > 0", 400, "AMOUNT_INVALID");

  const customerId: string | null = input.customerId ?? null;
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: input.companyId },
      select: { id: true },
    });
    if (!customer) throw new HttpError("Cliente no existe en esta empresa", 400, "CUSTOMER_INVALID");
  }

  const qty = input.quantity;
  if (qty !== undefined && qty !== null && (!Number.isInteger(qty) || qty < 0)) {
    throw new HttpError("Cantidad inválida", 400, "QUANTITY_INVALID");
  }
  const unitPc = input.unitPriceCents;
  if (unitPc !== undefined && unitPc !== null && (!Number.isInteger(unitPc) || unitPc < 0)) {
    throw new HttpError("Precio unitario inválido", 400, "UNIT_PRICE_INVALID");
  }

  const row = await prisma.revenue.create({
    data: {
      companyId: input.companyId,
      customerId,
      occurredAt: input.occurredAt,
      amountCents: centsToBigInt(input.amountCents),
      currency: normalizeCurrency(input.currency),
      description: input.description?.trim() || null,
      paymentMethod: input.paymentMethod ? sanitizeText(input.paymentMethod, { maxLen: 40 }) : null,
      reference: input.reference ? sanitizeText(input.reference, { maxLen: 120 }) : null,
      channel: input.channel ? sanitizeText(input.channel, { maxLen: 40 }) : null,
      quantity: qty ?? null,
      unitPriceCents: nullableCentsToBigInt(unitPc ?? null),
    },
    select: {
      id: true,
      occurredAt: true,
      amountCents: true,
      currency: true,
      description: true,
      paymentMethod: true,
      reference: true,
      channel: true,
      quantity: true,
      unitPriceCents: true,
      customerId: true,
      createdAt: true,
    },
  });
  return mapRevenueRow(row);
}

export async function updateRevenue(params: {
  companyId: string;
  revenueId: string;
  input: RevenueUpdateInput;
}) {
  const prisma = getPrisma();

  const current = await prisma.revenue.findFirst({
    where: { companyId: params.companyId, id: params.revenueId },
    select: { customerId: true },
  });
  if (!current) throw new HttpError("Venta no encontrada", 404, "REVENUE_NOT_FOUND");

  const data: Record<string, unknown> = {};
  if (params.input.customerId !== undefined) data.customerId = params.input.customerId;
  if (params.input.occurredAt !== undefined) data.occurredAt = params.input.occurredAt;
  if (params.input.amountCents !== undefined) data.amountCents = centsToBigInt(params.input.amountCents);
  if (params.input.currency !== undefined) data.currency = normalizeCurrency(params.input.currency);
  if (params.input.description !== undefined) data.description = params.input.description?.trim() || null;
  if (params.input.paymentMethod !== undefined) {
    data.paymentMethod = params.input.paymentMethod
      ? sanitizeText(params.input.paymentMethod, { maxLen: 40 })
      : null;
  }
  if (params.input.reference !== undefined) {
    data.reference = params.input.reference ? sanitizeText(params.input.reference, { maxLen: 120 }) : null;
  }
  if (params.input.channel !== undefined) {
    data.channel = params.input.channel ? sanitizeText(params.input.channel, { maxLen: 40 }) : null;
  }
  if (params.input.quantity !== undefined) {
    const q = params.input.quantity;
    if (q !== null && (!Number.isInteger(q) || q < 0)) {
      throw new HttpError("Cantidad inválida", 400, "QUANTITY_INVALID");
    }
    data.quantity = q;
  }
  if (params.input.unitPriceCents !== undefined) {
    const u = params.input.unitPriceCents;
    if (u !== null && (!Number.isInteger(u) || u < 0)) {
      throw new HttpError("Precio unitario inválido", 400, "UNIT_PRICE_INVALID");
    }
    data.unitPriceCents = nullableCentsToBigInt(u);
  }

  if (params.input.customerId !== undefined && params.input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: params.input.customerId, companyId: params.companyId },
      select: { id: true },
    });
    if (!customer) throw new HttpError("Cliente no existe en esta empresa", 400, "CUSTOMER_INVALID");
  }

  const count = await prisma.revenue.updateMany({
    where: { companyId: params.companyId, id: params.revenueId },
    data,
  });
  if (count.count === 0) throw new HttpError("Venta no encontrada", 404, "REVENUE_NOT_FOUND");

  const row = await prisma.revenue.findFirst({
    where: { companyId: params.companyId, id: params.revenueId },
  });
  if (!row) throw new HttpError("Venta no encontrada", 404, "REVENUE_NOT_FOUND");
  return mapRevenueRow(row);
}

export async function deleteRevenue(params: { companyId: string; revenueId: string }) {
  const prisma = getPrisma();
  const count = await prisma.revenue.deleteMany({
    where: { companyId: params.companyId, id: params.revenueId },
  });
  if (count.count === 0) throw new HttpError("Venta no encontrada", 404, "REVENUE_NOT_FOUND");
  return { ok: true };
}
