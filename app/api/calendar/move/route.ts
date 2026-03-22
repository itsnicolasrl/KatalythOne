import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { moveCalendarItem } from "@/src/services/calendar/calendarService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const moveSchema = z.object({
  sourceType: z.enum(["CUSTOM", "TASK", "OPERATION"]),
  sourceId: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.manage",
    });

    // Nota: `user` hoy no se usa; lo dejamos para futuros auditorías.
    void user;

    const body = moveSchema.parse(await req.json());

    await moveCalendarItem({
      companyId: company.id,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      startAt: body.startAt,
      endAt: body.endAt ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

