import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

export type ProjectTimeEntryCreateInput = {
  companyId: string;
  projectId: string;
  userId: string;
  minutes: number;
  description?: string | null;
  occurredAt: Date;
};

export async function createProjectTimeEntry(input: ProjectTimeEntryCreateInput) {
  const prisma = getPrisma();

  const minutes = Math.round(input.minutes);
  if (!Number.isInteger(minutes) || minutes <= 0) throw new HttpError("Horas inválidas", 400, "TIME_ENTRY_INVALID_MINUTES");

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, companyId: input.companyId },
    select: { id: true },
  });
  if (!project) throw new HttpError("Proyecto no encontrado", 404, "PROJECT_NOT_FOUND");

  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
    select: { userId: true },
  });
  if (!membership) throw new HttpError("Usuario no pertenece a la empresa", 400, "USER_NOT_IN_COMPANY");

  const entry = await prisma.projectTimeEntry.create({
    data: {
      companyId: input.companyId,
      projectId: input.projectId,
      userId: input.userId,
      minutes,
      description: input.description ?? null,
      occurredAt: input.occurredAt,
    },
    select: {
      id: true,
      userId: true,
      minutes: true,
      occurredAt: true,
      description: true,
      createdAt: true,
    },
  });

  return entry;
}

