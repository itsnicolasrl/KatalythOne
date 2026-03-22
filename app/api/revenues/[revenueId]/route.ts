import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { deleteRevenue, getRevenue, updateRevenue, moneyToCents } from "@/src/services/revenues/revenuesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const updateSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  occurredAt: z.coerce.date().optional(),
  amount: z.coerce.number().finite().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(0).max(500).optional().nullable(),
  paymentMethod: z.string().min(0).max(40).optional().nullable(),
  reference: z.string().min(0).max(120).optional().nullable(),
  channel: z.string().min(0).max(40).optional().nullable(),
  quantity: z.coerce.number().int().min(0).optional().nullable(),
  unitPrice: z.coerce.number().finite().min(0).optional().nullable(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ revenueId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.read",
    });

    const revenue = await getRevenue({ companyId: company.id, revenueId: params.revenueId });
    return NextResponse.json({ revenue });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ revenueId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.manage",
    });

    const body = updateSchema.parse(await req.json());
    const input: Parameters<typeof updateRevenue>[0]["input"] = {
      customerId: body.customerId === undefined ? undefined : body.customerId,
      occurredAt: body.occurredAt,
      amountCents: body.amount !== undefined ? moneyToCents(body.amount) : undefined,
      currency: body.currency,
      description: body.description === undefined ? undefined : body.description,
      paymentMethod: body.paymentMethod === undefined ? undefined : body.paymentMethod,
      reference: body.reference === undefined ? undefined : body.reference,
      channel: body.channel === undefined ? undefined : body.channel,
      quantity: body.quantity === undefined ? undefined : body.quantity,
      unitPriceCents:
        body.unitPrice === undefined
          ? undefined
          : body.unitPrice === null
            ? null
            : moneyToCents(body.unitPrice),
    };

    const revenue = await updateRevenue({
      companyId: company.id,
      revenueId: params.revenueId,
      input,
    });
    return NextResponse.json({ revenue });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ revenueId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.manage",
    });

    await deleteRevenue({ companyId: company.id, revenueId: params.revenueId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

