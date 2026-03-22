import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createTask, listTasks } from "@/src/services/tasks/tasksService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(0).max(1000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assigneeUserId: z.string().min(1).optional().nullable(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.read",
    });

    const tasks = await listTasks({
      companyId: company.id,
      projectId: params.projectId,
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.manage",
    });

    const body = createSchema.parse(await req.json());
    const task = await createTask({
      companyId: company.id,
      projectId: params.projectId,
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      priority: body.priority,
      dueAt: body.dueAt ?? null,
      assigneeUserId: body.assigneeUserId ?? null,
      createdByUserId: user.id,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

