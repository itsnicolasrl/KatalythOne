import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getCustomerRevenueHistory } from "@/src/services/customers/customerValueService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  req: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    const url = new URL(req.url);
    const takeSchema = z.coerce.number().int().min(1).max(200).optional();
    const take = takeSchema.safeParse(url.searchParams.get("take") ?? undefined).success
      ? takeSchema.parse(url.searchParams.get("take") ?? undefined)
      : undefined;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.read",
    });

    const history = await getCustomerRevenueHistory({
      companyId: company.id,
      customerId: params.customerId,
      take: take ?? 50,
    });

    return NextResponse.json({ history });
  } catch (err) {
    return toErrorResponse(err);
  }
}

