import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createProjectTimeEntry } from "@/src/services/projects/projectTimeEntriesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  userId: z.string().min(1),
  hours: z.coerce.number().positive().optional(),
  minutes: z.coerce.number().int().positive().optional(),
  description: z.string().max(1000).optional().nullable(),
  occurredAt: z.coerce.date().optional().nullable(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  // Por MVP, usamos el endpoint de summary que ya incluye timeEntries.
  void _req;
  void context;
  return NextResponse.json({ error: "No soportado en MVP. Usa /summary." }, { status: 400 });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.manage",
    });

    const params = await context.params;
    z.string().min(1).parse(params.projectId);

    const body = createSchema.parse(await req.json());

    const occurredAt = body.occurredAt ?? new Date();

    const minutes =
      body.minutes !== undefined
        ? body.minutes
        : body.hours !== undefined
          ? Math.round(body.hours * 60)
          : null;

    if (!minutes) {
      return NextResponse.json({ error: "Debes enviar `hours` o `minutes`" }, { status: 400 });
    }

    const entry = await createProjectTimeEntry({
      companyId: company.id,
      projectId: params.projectId,
      userId: body.userId,
      minutes,
      description: body.description ?? null,
      occurredAt,
    });

    void user;
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

