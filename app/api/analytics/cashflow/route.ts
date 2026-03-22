import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { computeCashflow } from "@/src/services/analytics/cashflowService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  bucket: z.enum(["day"]).optional().default("day"),
  periodDays: z.coerce.number().int().min(1).max(180).optional(),
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
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined,
      bucket: url.searchParams.get("bucket") ?? "day",
      periodDays: url.searchParams.get("periodDays") ?? undefined,
    });

    const endDate = parsed.end ? new Date(parsed.end) : new Date();
    const startDate = parsed.start
      ? new Date(parsed.start)
      : parsed.periodDays
        ? new Date(Date.now() - parsed.periodDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    const data = await computeCashflow({
      companyId: company.id,
      startDate,
      endDate,
      bucket: parsed.bucket,
    });

    return NextResponse.json({
      startDate: data.startDate,
      endDate: data.endDate,
      summaryByCurrency: data.summaryByCurrency,
      seriesByCurrency: data.seriesByCurrency,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

