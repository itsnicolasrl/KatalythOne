import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import type { TaskEventType, TaskStatus } from "@/src/generated/prisma";

export type TaskPriorityInput = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatusInput = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

export type TaskCreateInput = {
  companyId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatusInput;
  priority?: TaskPriorityInput;
  dueAt?: Date | null;
  assigneeUserId?: string | null;
  createdByUserId?: string | null;
};

export type TaskUpdateInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatusInput;
  priority?: TaskPriorityInput;
  dueAt?: Date | null;
  completedAt?: Date | null;
  assigneeUserId?: string | null;
  comment?: string | null;
};

function normalizeTitle(title: string): string {
  const t = title.trim();
  if (t.length < 2) throw new HttpError("Título inválido", 400, "TASK_TITLE_INVALID");
  if (t.length > 160) throw new HttpError("Título demasiado largo", 400, "TASK_TITLE_TOO_LONG");
  return t;
}

export async function listTasks(params: {
  companyId: string;
  projectId?: string | null;
}) {
  const prisma = getPrisma();
  return prisma.task.findMany({
    where: {
      companyId: params.companyId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueAt: true,
      completedAt: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      assigneeUserId: true,
    },
  });
}

export async function getTask(params: { companyId: string; taskId: string }) {
  const prisma = getPrisma();
  const task = await prisma.task.findFirst({
    where: { companyId: params.companyId, id: params.taskId },
  });
  if (!task) throw new HttpError("Tarea no encontrada", 404, "TASK_NOT_FOUND");
  return task;
}

async function createEvent(params: {
  companyId: string;
  taskId: string;
  type: TaskEventType;
  actorUserId?: string | null;
  statusFrom?: TaskStatus | null;
  statusTo?: TaskStatus | null;
  message?: string | null;
}) {
  const prisma = getPrisma();
  await prisma.taskEvent.create({
    data: {
      companyId: params.companyId,
      taskId: params.taskId,
      type: params.type,
      actorUserId: params.actorUserId ?? null,
      statusFrom: params.statusFrom ?? null,
      statusTo: params.statusTo ?? null,
      message: params.message ?? null,
    },
  });
}

export async function createTask(input: TaskCreateInput) {
  const prisma = getPrisma();
  const title = normalizeTitle(input.title);

  const projectId: string | null = input.projectId ?? null;
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { companyId: input.companyId, id: projectId },
      select: { id: true },
    });
    if (!project) throw new HttpError("Proyecto no existe en esta empresa", 400, "PROJECT_INVALID");
  }

  const assigneeUserId = input.assigneeUserId ?? null;
  if (assigneeUserId) {
    const user = await prisma.user.findFirst({
      where: { id: assigneeUserId },
      select: { id: true },
    });
    if (!user) throw new HttpError("Asignee inválido", 400, "ASSIGNEE_INVALID");
  }

  const task = await prisma.task.create({
    data: {
      companyId: input.companyId,
      projectId,
      title,
      description: input.description?.trim() || null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      dueAt: input.dueAt ?? null,
      completedAt: input.status === "DONE" ? new Date() : null,
      assigneeUserId: assigneeUserId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      completedAt: true,
      createdAt: true,
    },
  });

  await createEvent({
    companyId: input.companyId,
    taskId: task.id,
    type: "CREATED",
    actorUserId: input.createdByUserId ?? null,
    statusFrom: null,
    statusTo: task.status,
    message: task.title,
  });

  return task;
}

export async function updateTask(params: {
  companyId: string;
  taskId: string;
  input: TaskUpdateInput;
  actorUserId?: string | null;
}) {
  const prisma = getPrisma();
  const current = await prisma.task.findFirst({
    where: { companyId: params.companyId, id: params.taskId },
    select: { id: true, status: true, priority: true, dueAt: true, completedAt: true },
  });
  if (!current) throw new HttpError("Tarea no encontrada", 404, "TASK_NOT_FOUND");

  let statusTo = current.status;
  if (params.input.status !== undefined) statusTo = params.input.status;

  const data: Record<string, unknown> = {};
  if (params.input.title !== undefined) data.title = normalizeTitle(params.input.title);
  if (params.input.description !== undefined) data.description = params.input.description?.trim() || null;
  if (params.input.priority !== undefined) data.priority = params.input.priority;
  if (params.input.dueAt !== undefined) data.dueAt = params.input.dueAt;
  if (params.input.assigneeUserId !== undefined) data.assigneeUserId = params.input.assigneeUserId;

  // CompletedAt consistente con status.
  let completedAtTo: Date | null = current.completedAt;
  if (statusTo === "DONE") completedAtTo = params.input.completedAt ?? new Date();
  if (statusTo !== "DONE") completedAtTo = params.input.completedAt ?? null;
  data.completedAt = completedAtTo;

  if (params.input.status !== undefined) data.status = statusTo;

  await prisma.task.update({
    where: { id: params.taskId },
    data,
  });

  // Eventos de seguimiento
  const events: Array<Promise<void>> = [];
  if (params.input.status !== undefined && statusTo !== current.status) {
    events.push(
      createEvent({
        companyId: params.companyId,
        taskId: params.taskId,
        type: "STATUS_CHANGED",
        actorUserId: params.actorUserId ?? null,
        statusFrom: current.status,
        statusTo,
        message: `Status: ${current.status} -> ${statusTo}`,
      }),
    );
  }

  if (params.input.comment !== undefined && params.input.comment?.trim()) {
    events.push(
      createEvent({
        companyId: params.companyId,
        taskId: params.taskId,
        type: "COMMENT",
        actorUserId: params.actorUserId ?? null,
        message: params.input.comment.trim(),
      }),
    );
  }

  await Promise.all(events);

  return prisma.task.findFirst({
    where: { companyId: params.companyId, id: params.taskId },
  });
}

export async function deleteTask(params: { companyId: string; taskId: string }) {
  const prisma = getPrisma();
  const count = await prisma.task.deleteMany({
    where: { companyId: params.companyId, id: params.taskId },
  });
  if (count.count === 0) throw new HttpError("Tarea no encontrada", 404, "TASK_NOT_FOUND");
  return { ok: true };
}

export async function listTaskEvents(params: { companyId: string; taskId: string; take?: number }) {
  const prisma = getPrisma();
  const take = params.take ?? 50;

  await prisma.task.findFirst({
    where: { companyId: params.companyId, id: params.taskId },
    select: { id: true },
  }).then((t) => {
    if (!t) throw new HttpError("Tarea no encontrada", 404, "TASK_NOT_FOUND");
  });

  return prisma.taskEvent.findMany({
    where: { companyId: params.companyId, taskId: params.taskId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      statusFrom: true,
      statusTo: true,
      message: true,
      actorUserId: true,
      createdAt: true,
    },
  });
}

