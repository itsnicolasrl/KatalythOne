import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createOperation, listOperations } from "@/src/services/operations/operationsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  name: z.string().min(2).max(160),
  status: z.enum(["PLANNED", "RUNNING", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
  scheduledFor: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  description: z.string().min(0).max(1000).optional().nullable(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.operations.read",
    });

    const operations = await listOperations({ companyId: company.id, take: 100 });
    return NextResponse.json({ operations });
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
      permissionKey: "company.operations.manage",
    });

    const body = createSchema.parse(await req.json());
    const operation = await createOperation({
      companyId: company.id,
      name: body.name,
      status: body.status,
      scheduledFor: body.scheduledFor ?? null,
      completedAt: body.completedAt ?? null,
      description: body.description ?? null,
    });

    return NextResponse.json({ operation }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

