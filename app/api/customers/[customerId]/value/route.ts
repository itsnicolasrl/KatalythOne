import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getCustomerValue } from "@/src/services/customers/customerValueService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  _req: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    // Para consultar valor del cliente.
    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.read",
    });

    z.object({ customerId: z.string().min(1) }).parse({ customerId: params.customerId });

    const value = await getCustomerValue({
      companyId: company.id,
      customerId: params.customerId,
    });

    return NextResponse.json({ value });
  } catch (err) {
    return toErrorResponse(err);
  }
}

