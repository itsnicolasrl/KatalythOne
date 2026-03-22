import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { deleteTask, getTask, updateTask } from "@/src/services/tasks/tasksService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const patchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().min(0).max(1000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  assigneeUserId: z.string().min(1).optional().nullable(),
  comment: z.string().min(1).max(1200).optional().nullable(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ taskId: string }> },
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

    const task = await getTask({ companyId: company.id, taskId: params.taskId });
    return NextResponse.json({ task });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ taskId: string }> },
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

    const body = patchSchema.parse(await req.json());
    const task = await updateTask({
      companyId: company.id,
      taskId: params.taskId,
      input: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueAt: body.dueAt,
        completedAt: body.completedAt,
        assigneeUserId: body.assigneeUserId,
        comment: body.comment,
      },
      actorUserId: user.id,
    });

    return NextResponse.json({ task });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.manage",
    });

    await deleteTask({ companyId: company.id, taskId: params.taskId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

