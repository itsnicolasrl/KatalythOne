import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { receivePurchaseOrder } from "@/src/services/purchaseOrders/purchaseOrdersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const receiveSchema = z.object({
  receivedAt: z.coerce.date(),
  note: z.string().max(2000).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ purchaseOrderId: string }> },
) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    const params = await context.params;
    const body = receiveSchema.parse(await req.json());

    const result = await receivePurchaseOrder({
      companyId: company.id,
      purchaseOrderId: params.purchaseOrderId,
      receivedAt: body.receivedAt,
      note: body.note ?? null,
      projectId: body.projectId ?? null,
      receivedByUserId: user.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

