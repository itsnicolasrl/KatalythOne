import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { simulateGrowthBundle } from "@/src/services/analytics/simulationService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const bodySchema = z.object({
  priceIncreasePercent: z.number().min(-80).max(200).default(0),
  expenseIncreasePercent: z.number().min(-80).max(200).default(0),
  newCustomersCount: z.number().int().min(0).max(100000).default(0),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    enforceRateLimit({
      key: `sim:${user.id}:${getClientIp(req)}`,
      max: 10,
      windowMs: 10 * 60 * 1000,
    });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.read",
    });

    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const result = await simulateGrowthBundle({
      companyId: company.id,
      inputs: body,
      createdByUserId: user.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

