import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { computeAndStoreSnapshot } from "@/src/services/analytics/metricsService";
import { runDiagnosticsForLatestSnapshot } from "@/src/services/diagnostics/diagnosticsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  periodDays: z.number().int().min(1).max(365).optional().default(30),
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) {
      return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    }

    const body = bodySchema.parse(await req.json().catch(() => ({})));
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - body.periodDays * 24 * 60 * 60 * 1000);

    const snapshot = await computeAndStoreSnapshot({
      companyId: company.id,
      periodStart,
      periodEnd,
    });

    const diagnostics = await runDiagnosticsForLatestSnapshot(company.id);
    return NextResponse.json({ ok: true, snapshot, diagnostics });
  } catch (err) {
    return toErrorResponse(err);
  }
}

