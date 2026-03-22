import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { deleteOperation, getOperation, updateOperation } from "@/src/services/operations/operationsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const updateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  status: z.enum(["PLANNED", "RUNNING", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
  scheduledFor: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  description: z.string().min(0).max(1000).optional().nullable(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ operationId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.operations.read",
    });

    const operation = await getOperation({ companyId: company.id, operationId: params.operationId });
    return NextResponse.json({ operation });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ operationId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.operations.manage",
    });

    const body = updateSchema.parse(await req.json());
    const operation = await updateOperation({
      companyId: company.id,
      operationId: params.operationId,
      input: body,
    });
    return NextResponse.json({ operation });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ operationId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.operations.manage",
    });

    await deleteOperation({ companyId: company.id, operationId: params.operationId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

