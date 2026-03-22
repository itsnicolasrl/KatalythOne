import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { listTasks } from "@/src/services/tasks/tasksService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { createTask } from "@/src/services/tasks/tasksService";

export async function GET(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.read",
    });

    const url = new URL(req.url);
    const querySchema = z.object({
      projectId: z.string().min(1).optional(),
    });
    const parsed = querySchema.parse({
      projectId: url.searchParams.get("projectId") ?? undefined,
    });

    const tasks = await listTasks({
      companyId: company.id,
      projectId: parsed.projectId ?? null,
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const createSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  title: z.string().min(2).max(160),
  description: z.string().min(0).max(1000).optional().nullable(),
  status: z
    .enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assigneeUserId: z.string().min(1).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.manage",
    });

    const body = createSchema.parse(await req.json());
    const task = await createTask({
      companyId: company.id,
      projectId: body.projectId ?? null,
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

