import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import {
  deleteMetricSnapshot,
  getMetricSnapshot,
  recomputeMetricSnapshot,
} from "@/src/services/analytics/metricsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const recomputeSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.read",
    });

    const snapshot = await getMetricSnapshot({
      companyId: company.id,
      snapshotId: params.snapshotId,
    });
    return NextResponse.json({ snapshot });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.manage",
    });

    await deleteMetricSnapshot({ companyId: company.id, snapshotId: params.snapshotId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.metrics.manage",
    });

    const body = recomputeSchema.parse(await req.json());
    if (body.periodEnd.getTime() <= body.periodStart.getTime()) {
      return NextResponse.json({ error: "periodEnd debe ser > periodStart" }, { status: 400 });
    }

    const snapshot = await recomputeMetricSnapshot({
      companyId: company.id,
      snapshotId: params.snapshotId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });

    return NextResponse.json({ snapshot });
  } catch (err) {
    return toErrorResponse(err);
  }
}

