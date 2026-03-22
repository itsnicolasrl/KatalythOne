import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createRevenue, listRevenues, moneyToCents } from "@/src/services/revenues/revenuesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  occurredAt: z.coerce.date(),
  amount: z.coerce.number().finite().positive(),
  currency: z.string().min(3).max(3),
  description: z.string().min(0).max(500).optional().nullable(),
  paymentMethod: z.string().min(0).max(40).optional().nullable(),
  reference: z.string().min(0).max(120).optional().nullable(),
  channel: z.string().min(0).max(40).optional().nullable(),
  quantity: z.coerce.number().int().min(0).optional().nullable(),
  unitPrice: z.coerce.number().finite().min(0).optional().nullable(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.read",
    });

    const revenues = await listRevenues({ companyId: company.id, take: 100 });
    return NextResponse.json({ revenues });
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
      permissionKey: "company.revenues.manage",
    });

    const body = createSchema.parse(await req.json());
    const revenue = await createRevenue({
      companyId: company.id,
      customerId: body.customerId ?? null,
      occurredAt: body.occurredAt,
      amountCents: moneyToCents(body.amount),
      currency: body.currency,
      description: body.description ?? null,
      paymentMethod: body.paymentMethod ?? null,
      reference: body.reference ?? null,
      channel: body.channel ?? null,
      quantity: body.quantity ?? null,
      unitPriceCents:
        body.unitPrice === null || body.unitPrice === undefined
          ? null
          : moneyToCents(body.unitPrice),
    });

    return NextResponse.json({ revenue }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

