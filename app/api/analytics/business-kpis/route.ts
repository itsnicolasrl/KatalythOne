import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { computeMonthlyBusinessKpis } from "@/src/services/analytics/monthlyBusinessKpisService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const querySchema = z.object({
  monthsBack: z.coerce.number().int().min(3).max(18).optional().default(6),
  activeDays: z.coerce.number().int().min(7).max(90).optional().default(30),
});

export async function GET(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.read",
    });

    const url = new URL(req.url);
    const parsed = querySchema.parse({
      monthsBack: url.searchParams.get("monthsBack") ?? undefined,
      activeDays: url.searchParams.get("activeDays") ?? undefined,
    });

    const data = await computeMonthlyBusinessKpis({
      companyId: company.id,
      monthsBack: parsed.monthsBack,
      activeDays: parsed.activeDays,
    });

    return NextResponse.json({
      startDate: data.startDate,
      endDate: data.endDate,
      activeCustomersCount: data.activeCustomersCount,
      byCurrency: data.byCurrency,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

