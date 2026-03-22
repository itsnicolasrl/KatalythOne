import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";
export type ProjectCreateInput = {
  companyId: string;
  name: string;
  description?: string | null;
  status?: "ACTIVE" | "ARCHIVED";
  createdByUserId?: string | null;
};

export type ProjectUpdateInput = {
  name?: string;
  description?: string | null;
  status?: "ACTIVE" | "ARCHIVED";
};

async function listProjectsUncached(params: { companyId: string }) {
  const prisma = getPrisma();
  return prisma.project.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

const listProjectsCache = createTtlCache<
  Awaited<ReturnType<typeof listProjectsUncached>>
>({ ttlMs: 15_000 });
const listProjectsInFlight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof listProjectsUncached>>>
>();

export async function listProjects(params: { companyId: string }) {
  const key = `listProjects|${params.companyId}`;
  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: listProjectsCache,
    inFlight: listProjectsInFlight,
    factory: async () => listProjectsUncached(params),
  });
}

export async function getProject(params: { companyId: string; projectId: string }) {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { companyId: params.companyId, id: params.projectId },
  });
  if (!project) throw new HttpError("Proyecto no encontrado", 404, "PROJECT_NOT_FOUND");
  return project;
}

export async function createProject(input: ProjectCreateInput) {
  const prisma = getPrisma();
  const name = input.name.trim();
  if (name.length < 2) throw new HttpError("Nombre inválido", 400, "PROJECT_NAME_INVALID");

  return prisma.project.create({
    data: {
      companyId: input.companyId,
      name,
      description: input.description?.trim() || null,
      status: input.status ?? "ACTIVE",
      createdByUserId: input.createdByUserId ?? null,
    },
    select: { id: true, name: true, description: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function updateProject(params: {
  companyId: string;
  projectId: string;
  input: ProjectUpdateInput;
}) {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {};

  if (params.input.name !== undefined) data.name = params.input.name.trim();
  if (params.input.description !== undefined) data.description = params.input.description?.trim() || null;
  if (params.input.status !== undefined) data.status = params.input.status;

  const count = await prisma.project.updateMany({
    where: { companyId: params.companyId, id: params.projectId },
    data,
  });
  if (count.count === 0) throw new HttpError("Proyecto no encontrado", 404, "PROJECT_NOT_FOUND");

  return prisma.project.findFirst({
    where: { companyId: params.companyId, id: params.projectId },
  });
}

export async function deleteProject(params: { companyId: string; projectId: string }) {
  const prisma = getPrisma();
  const count = await prisma.project.deleteMany({
    where: { companyId: params.companyId, id: params.projectId },
  });
  if (count.count === 0) throw new HttpError("Proyecto no encontrado", 404, "PROJECT_NOT_FOUND");
  return { ok: true };
}

