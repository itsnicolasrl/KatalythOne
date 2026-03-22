import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

export async function createCompany(params: {
  userId: string;
  name: string;
}) {
  const prisma = getPrisma();
  const trimmed = params.name.trim();
  if (trimmed.length < 2) {
    throw new HttpError("El nombre de la empresa es demasiado corto", 400);
  }

  const company = await prisma.company.create({
    data: {
      name: trimmed,
      memberships: {
        create: {
          userId: params.userId,
          role: "OWNER",
        },
      },
    },
    select: { id: true, name: true, createdAt: true },
  });

  return company;
}

export async function listCompaniesForUser(userId: string) {
  const prisma = getPrisma();
  const memberships = await prisma.companyUser.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
    },
  });

  return memberships.map((m) => ({
    companyId: m.companyId,
    role: m.role,
    company: m.company,
  }));
}

export async function getActiveCompanyForUser(userId: string, activeCompanyId?: string | null) {
  const prisma = getPrisma();

  if (activeCompanyId) {
    const membership = await prisma.companyUser.findFirst({
      where: { userId, companyId: activeCompanyId },
      include: { company: true },
    });
    if (membership) return membership.company;
  }

  const membership = await prisma.companyUser.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  if (!membership) return null;
  return membership.company;
}

