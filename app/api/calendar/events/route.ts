import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createCalendarEvent, listCalendarItems } from "@/src/services/calendar/calendarService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const calendarTypeEnum = z.enum([
  "MEETING",
  "CUSTOMER_PAYMENT_DUE",
  "SUPPLIER_PAYMENT_DUE",
  "TAX_DUE",
  "CAMPAIGN_LAUNCH",
  "TASK",
  "OPERATION",
  "CUSTOM",
]);

const createSchema = z.object({
  type: calendarTypeEnum,
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  allDay: z.boolean().optional(),
  priority: z.number().int().optional().nullable(),

  // Relaciones opcionales (si se desea).
  customerId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  supplierId: z.string().min(1).optional().nullable(),
  taskId: z.string().min(1).optional().nullable(),
  operationId: z.string().min(1).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.read",
    });

    const url = new URL(req.url);
    const querySchema = z.object({
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
    });

    const parsed = querySchema.parse({
      startAt: url.searchParams.get("startAt"),
      endAt: url.searchParams.get("endAt"),
    });

    const items = await listCalendarItems({
      companyId: company.id,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
    });

    return NextResponse.json({ items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.manage",
    });

    const body = createSchema.parse(await req.json());

    const ev = await createCalendarEvent({
      companyId: company.id,
      type: body.type,
      title: body.title,
      description: body.description ?? null,
      startAt: body.startAt,
      endAt: body.endAt ?? null,
      allDay: body.allDay ?? false,
      priority: body.priority ?? null,
      customerId: body.customerId ?? null,
      projectId: body.projectId ?? null,
      supplierId: body.supplierId ?? null,
      taskId: body.taskId ?? null,
      operationId: body.operationId ?? null,
    });

    return NextResponse.json({ event: ev }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

