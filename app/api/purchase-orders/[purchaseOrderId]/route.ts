import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getPurchaseOrderDetail } from "@/src/services/purchaseOrders/purchaseOrdersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  _req: Request,
  context: { params: Promise<{ purchaseOrderId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    const params = await context.params;
    z.string().min(1).parse(params.purchaseOrderId);

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.read",
    });

    const order = await getPurchaseOrderDetail({
      companyId: company.id,
      purchaseOrderId: params.purchaseOrderId,
    });

    return NextResponse.json({ order });
  } catch (err) {
    return toErrorResponse(err);
  }
}

