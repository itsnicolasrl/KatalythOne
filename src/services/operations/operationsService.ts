import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

export type OperationCreateInput = {
  companyId: string;
  name: string;
  status?: "PLANNED" | "RUNNING" | "COMPLETED" | "PAUSED" | "CANCELLED";
  scheduledFor?: Date | null;
  completedAt?: Date | null;
  description?: string | null;
};

export type OperationUpdateInput = {
  name?: string;
  status?: "PLANNED" | "RUNNING" | "COMPLETED" | "PAUSED" | "CANCELLED";
  scheduledFor?: Date | null;
  completedAt?: Date | null;
  description?: string | null;
};

export async function listOperations(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  return prisma.operation.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 100,
    select: {
      id: true,
      name: true,
      status: true,
      scheduledFor: true,
      completedAt: true,
      description: true,
      createdAt: true,
    },
  });
}

export async function getOperation(params: { companyId: string; operationId: string }) {
  const prisma = getPrisma();
  const op = await prisma.operation.findFirst({
    where: { companyId: params.companyId, id: params.operationId },
  });
  if (!op) throw new HttpError("Operación no encontrada", 404, "OPERATION_NOT_FOUND");
  return op;
}

export async function createOperation(input: OperationCreateInput) {
  const prisma = getPrisma();
  const name = input.name.trim();
  if (name.length < 2) throw new HttpError("Nombre inválido", 400, "OPERATION_NAME_INVALID");

  return prisma.operation.create({
    data: {
      companyId: input.companyId,
      name,
      status: input.status ?? "PLANNED",
      scheduledFor: input.scheduledFor ?? null,
      completedAt: input.completedAt ?? null,
      description: input.description?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      scheduledFor: true,
      completedAt: true,
      description: true,
      createdAt: true,
    },
  });
}

export async function updateOperation(params: {
  companyId: string;
  operationId: string;
  input: OperationUpdateInput;
}) {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};
  if (params.input.name !== undefined) data.name = params.input.name.trim();
  if (params.input.status !== undefined) data.status = params.input.status;
  if (params.input.scheduledFor !== undefined) data.scheduledFor = params.input.scheduledFor;
  if (params.input.completedAt !== undefined) data.completedAt = params.input.completedAt;
  if (params.input.description !== undefined)
    data.description = params.input.description?.trim() || null;

  const count = await prisma.operation.updateMany({
    where: { companyId: params.companyId, id: params.operationId },
    data,
  });
  if (count.count === 0) throw new HttpError("Operación no encontrada", 404, "OPERATION_NOT_FOUND");

  return prisma.operation.findFirst({
    where: { companyId: params.companyId, id: params.operationId },
  });
}

export async function deleteOperation(params: { companyId: string; operationId: string }) {
  const prisma = getPrisma();
  const count = await prisma.operation.deleteMany({
    where: { companyId: params.companyId, id: params.operationId },
  });
  if (count.count === 0) throw new HttpError("Operación no encontrada", 404, "OPERATION_NOT_FOUND");
  return { ok: true };
}

