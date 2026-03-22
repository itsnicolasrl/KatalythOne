import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { listTaskEvents } from "@/src/services/tasks/tasksService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  req: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    const url = new URL(req.url);
    const takeSchema = z.coerce.number().int().min(1).max(200).optional();
    const takeParsed = takeSchema.safeParse(url.searchParams.get("take") ?? undefined);
    const take = takeParsed.success ? takeParsed.data : undefined;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.read",
    });

    const events = await listTaskEvents({
      companyId: company.id,
      taskId: params.taskId,
      take,
    });

    return NextResponse.json({ events });
  } catch (err) {
    return toErrorResponse(err);
  }
}

