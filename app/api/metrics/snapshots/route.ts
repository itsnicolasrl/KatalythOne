import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { computeAndStoreSnapshot, listMetricSnapshots } from "@/src/services/analytics/metricsService";
import { runDiagnosticsForLatestSnapshot } from "@/src/services/diagnostics/diagnosticsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const computeSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.read",
    });

    const snapshots = await listMetricSnapshots({ companyId: company.id, take: 50 });
    return NextResponse.json({ snapshots });
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
      permissionKey: "company.metrics.manage",
    });

    const body = computeSchema.parse(await req.json());
    if (body.periodEnd.getTime() <= body.periodStart.getTime()) {
      return NextResponse.json({ error: "periodEnd debe ser > periodStart" }, { status: 400 });
    }

    const snapshot = await computeAndStoreSnapshot({
      companyId: company.id,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });

    // Encadena: Snapshot -> Diagnósticos -> Alertas -> Recomendaciones
    await runDiagnosticsForLatestSnapshot(company.id);

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

