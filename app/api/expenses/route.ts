import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createExpense, listExpenses, moneyToCents } from "@/src/services/expenses/expensesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  occurredAt: z.coerce.date(),
  amount: z.coerce.number().finite().positive(),
  currency: z.string().min(3).max(3),
  description: z.string().min(0).max(500).optional().nullable(),
  category: z.string().min(0).max(80).optional().nullable(),
  vendor: z.string().min(0).max(120).optional().nullable(),
  paymentMethod: z.string().min(0).max(40).optional().nullable(),
  isRecurring: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.read",
    });

    const expenses = await listExpenses({ companyId: company.id, take: 100 });
    return NextResponse.json({ expenses });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    const body = createSchema.parse(await req.json());
    const expense = await createExpense({
      companyId: company.id,
      occurredAt: body.occurredAt,
      amountCents: moneyToCents(body.amount),
      currency: body.currency,
      description: body.description ?? null,
      category: body.category ?? null,
      vendor: body.vendor ?? null,
      paymentMethod: body.paymentMethod ?? null,
      isRecurring: body.isRecurring ?? false,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

