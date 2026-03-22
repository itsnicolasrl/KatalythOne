import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { centsFromPrisma, centsToBigInt } from "@/src/lib/money/centsBigInt";
import { sanitizeText } from "@/src/lib/sanitize";

export type ExpenseCreateInput = {
  companyId: string;
  occurredAt: Date;
  amountCents: number;
  currency: string;
  description?: string | null;
  category?: string | null;
  vendor?: string | null;
  paymentMethod?: string | null;
  isRecurring?: boolean;
};

export type ExpenseUpdateInput = {
  occurredAt?: Date;
  amountCents?: number;
  currency?: string;
  description?: string | null;
  category?: string | null;
  vendor?: string | null;
  paymentMethod?: string | null;
  isRecurring?: boolean;
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

function mapExpenseRow<T extends { amountCents: bigint | number }>(row: T) {
  return { ...row, amountCents: centsFromPrisma(row.amountCents) };
}

export async function listExpenses(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  const rows = await prisma.expense.findMany({
    where: { companyId: params.companyId },
    orderBy: { occurredAt: "desc" },
    take: params.take ?? 100,
    select: {
      id: true,
      occurredAt: true,
      amountCents: true,
      currency: true,
      description: true,
      category: true,
      vendor: true,
      paymentMethod: true,
      isRecurring: true,
      createdAt: true,
    },
  });
  return rows.map(mapExpenseRow);
}

export async function getExpense(params: { companyId: string; expenseId: string }) {
  const prisma = getPrisma();
  const expense = await prisma.expense.findFirst({
    where: { companyId: params.companyId, id: params.expenseId },
  });
  if (!expense) throw new HttpError("Gasto no encontrado", 404, "EXPENSE_NOT_FOUND");
  return mapExpenseRow(expense);
}

export async function createExpense(input: ExpenseCreateInput) {
  const prisma = getPrisma();
  if (input.amountCents <= 0) throw new HttpError("Monto debe ser > 0", 400, "AMOUNT_INVALID");
  const row = await prisma.expense.create({
    data: {
      companyId: input.companyId,
      occurredAt: input.occurredAt,
      amountCents: centsToBigInt(input.amountCents),
      currency: normalizeCurrency(input.currency),
      description: input.description?.trim() || null,
      category: input.category ? sanitizeText(input.category, { maxLen: 80 }) : null,
      vendor: input.vendor ? sanitizeText(input.vendor, { maxLen: 120 }) : null,
      paymentMethod: input.paymentMethod ? sanitizeText(input.paymentMethod, { maxLen: 40 }) : null,
      isRecurring: input.isRecurring ?? false,
    },
    select: {
      id: true,
      occurredAt: true,
      amountCents: true,
      currency: true,
      description: true,
      category: true,
      vendor: true,
      paymentMethod: true,
      isRecurring: true,
      createdAt: true,
    },
  });
  return mapExpenseRow(row);
}

export async function updateExpense(params: {
  companyId: string;
  expenseId: string;
  input: ExpenseUpdateInput;
}) {
  const prisma = getPrisma();

  const count = await prisma.expense.updateMany({
    where: { companyId: params.companyId, id: params.expenseId },
    data: {
      ...(params.input.occurredAt !== undefined ? { occurredAt: params.input.occurredAt } : {}),
      ...(params.input.amountCents !== undefined
        ? { amountCents: centsToBigInt(params.input.amountCents) }
        : {}),
      ...(params.input.currency !== undefined ? { currency: normalizeCurrency(params.input.currency) } : {}),
      ...(params.input.description !== undefined ? { description: params.input.description?.trim() || null } : {}),
      ...(params.input.category !== undefined
        ? { category: params.input.category ? sanitizeText(params.input.category, { maxLen: 80 }) : null }
        : {}),
      ...(params.input.vendor !== undefined
        ? { vendor: params.input.vendor ? sanitizeText(params.input.vendor, { maxLen: 120 }) : null }
        : {}),
      ...(params.input.paymentMethod !== undefined
        ? {
            paymentMethod: params.input.paymentMethod
              ? sanitizeText(params.input.paymentMethod, { maxLen: 40 })
              : null,
          }
        : {}),
      ...(params.input.isRecurring !== undefined ? { isRecurring: params.input.isRecurring } : {}),
    },
  });

  if (count.count === 0) throw new HttpError("Gasto no encontrado", 404, "EXPENSE_NOT_FOUND");

  const row = await prisma.expense.findFirst({
    where: { companyId: params.companyId, id: params.expenseId },
  });
  if (!row) throw new HttpError("Gasto no encontrado", 404, "EXPENSE_NOT_FOUND");
  return mapExpenseRow(row);
}

export async function deleteExpense(params: { companyId: string; expenseId: string }) {
  const prisma = getPrisma();
  const count = await prisma.expense.deleteMany({
    where: { companyId: params.companyId, id: params.expenseId },
  });
  if (count.count === 0) throw new HttpError("Gasto no encontrado", 404, "EXPENSE_NOT_FOUND");
  return { ok: true };
}
