import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import type { CalendarEventStatus, CalendarEventType } from "@/src/generated/prisma";

export type CalendarSourceType = "CUSTOM" | "TASK" | "OPERATION";

export type CalendarItem = {
  id: string;
  sourceType: CalendarSourceType;
  sourceId: string;

  title: string;
  description?: string | null;

  startAt: Date;
  endAt: Date | null;
  allDay: boolean;

  type: CalendarEventType;
  status: CalendarEventStatus;
  priority: number | null;
};

export type CalendarEventCreateInput = {
  companyId: string;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  priority?: number | null;
  customerId?: string | null;
  projectId?: string | null;
  supplierId?: string | null;
  taskId?: string | null;
  operationId?: string | null;
};

function taskPriorityToCalendarPriority(
  p: "LOW" | "MEDIUM" | "HIGH" | "URGENT",
): number {
  switch (p) {
    case "LOW":
      return 1;
    case "MEDIUM":
      return 2;
    case "HIGH":
      return 3;
    case "URGENT":
      return 4;
  }
}

export async function listCalendarItems(params: { companyId: string; startAt: Date; endAt: Date }) {
  const prisma = getPrisma();

  // 1) Eventos custom desde DB.
  const custom = await prisma.calendarEvent.findMany({
    where: {
      companyId: params.companyId,
      // Solapamiento básico: (start dentro) OR (end dentro) OR (spans sobre el rango).
      AND: [
        { startAt: { lte: params.endAt } },
        {
          OR: [{ endAt: null }, { endAt: { gte: params.startAt } }],
        },
      ],
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      priority: true,
    },
  });

  // 2) Tareas -> eventos virtuales (TASK).
  const tasks = await prisma.task.findMany({
    where: {
      companyId: params.companyId,
      dueAt: { not: null, lte: params.endAt, gte: params.startAt },
    },
    orderBy: { dueAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
      status: true,
      priority: true,
      projectId: true,
    },
  });

  // 3) Operaciones -> eventos virtuales (OPERATION).
  const operations = await prisma.operation.findMany({
    where: {
      companyId: params.companyId,
      scheduledFor: { not: null, lte: params.endAt, gte: params.startAt },
    },
    orderBy: { scheduledFor: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      scheduledFor: true,
      status: true,
    },
  });

  const items: CalendarItem[] = [];

  for (const e of custom) {
    items.push({
      id: e.id,
      sourceType: "CUSTOM",
      sourceId: e.id,
      title: e.title,
      description: e.description,
      startAt: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay,
      type: e.type,
      status: e.status,
      priority: e.priority ?? null,
    });
  }

  for (const t of tasks) {
    items.push({
      id: `task:${t.id}`,
      sourceType: "TASK",
      sourceId: t.id,
      title: t.title,
      description: t.description,
      startAt: t.dueAt as Date,
      endAt: null,
      allDay: false,
      type: "TASK",
      // Para mapear TaskStatus -> CalendarEventStatus usamos OPEN/DONE.
      status: t.status === "DONE" ? "DONE" : "OPEN",
      priority: t.priority ? taskPriorityToCalendarPriority(t.priority) : null,
    });
  }

  for (const o of operations) {
    items.push({
      id: `op:${o.id}`,
      sourceType: "OPERATION",
      sourceId: o.id,
      title: o.name,
      description: o.description,
      startAt: o.scheduledFor as Date,
      endAt: null,
      allDay: false,
      type: "OPERATION",
      status: o.status === "COMPLETED" ? "DONE" : "OPEN",
      priority: null,
    });
  }

  return items;
}

export async function createCalendarEvent(input: CalendarEventCreateInput) {
  const prisma = getPrisma();
  const title = input.title.trim();
  if (title.length < 2) throw new HttpError("Título inválido", 400, "CAL_EVENT_TITLE_INVALID");

  const ev = await prisma.calendarEvent.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      title,
      description: input.description ?? null,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      allDay: input.allDay ?? false,
      priority: input.priority ?? null,
      customerId: input.customerId ?? null,
      projectId: input.projectId ?? null,
      supplierId: input.supplierId ?? null,
      taskId: input.taskId ?? null,
      operationId: input.operationId ?? null,
    },
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      priority: true,
    },
  });

  return ev;
}

export async function moveCalendarItem(params: {
  companyId: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  startAt: Date;
  endAt?: Date | null;
}) {
  const prisma = getPrisma();

  if (params.sourceType === "CUSTOM") {
    const ev = await prisma.calendarEvent.findFirst({
      where: { companyId: params.companyId, id: params.sourceId },
      select: { id: true },
    });
    if (!ev) throw new HttpError("Evento no encontrado", 404, "CAL_EVENT_NOT_FOUND");

    await prisma.calendarEvent.update({
      where: { id: params.sourceId },
      data: {
        startAt: params.startAt,
        endAt: params.endAt ?? null,
      },
    });
    return { ok: true };
  }

  if (params.sourceType === "TASK") {
    await prisma.task.updateMany({
      where: { companyId: params.companyId, id: params.sourceId },
      data: { dueAt: params.startAt },
    });
    return { ok: true };
  }

  if (params.sourceType === "OPERATION") {
    await prisma.operation.updateMany({
      where: { companyId: params.companyId, id: params.sourceId },
      data: { scheduledFor: params.startAt },
    });
    return { ok: true };
  }

  throw new HttpError("sourceType inválido", 400, "CAL_SOURCE_INVALID");
}

