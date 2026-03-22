import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { deleteExpense, getExpense, moneyToCents, updateExpense } from "@/src/services/expenses/expensesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const updateSchema = z.object({
  occurredAt: z.coerce.date().optional(),
  amount: z.coerce.number().finite().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(0).max(500).optional().nullable(),
  category: z.string().min(0).max(80).optional().nullable(),
  vendor: z.string().min(0).max(120).optional().nullable(),
  paymentMethod: z.string().min(0).max(40).optional().nullable(),
  isRecurring: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ expenseId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.read",
    });

    const expense = await getExpense({ companyId: company.id, expenseId: params.expenseId });
    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ expenseId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    const body = updateSchema.parse(await req.json());
    const input: Parameters<typeof updateExpense>[0]["input"] = {
      occurredAt: body.occurredAt,
      amountCents: body.amount !== undefined ? moneyToCents(body.amount) : undefined,
      currency: body.currency,
      description: body.description === undefined ? undefined : body.description,
      category: body.category === undefined ? undefined : body.category,
      vendor: body.vendor === undefined ? undefined : body.vendor,
      paymentMethod: body.paymentMethod === undefined ? undefined : body.paymentMethod,
      isRecurring: body.isRecurring,
    };

    const expense = await updateExpense({
      companyId: company.id,
      expenseId: params.expenseId,
      input,
    });
    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ expenseId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    await deleteExpense({ companyId: company.id, expenseId: params.expenseId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

