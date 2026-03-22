import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

export async function listCompanyMemberships(companyId: string) {
  const prisma = getPrisma();
  return prisma.companyUser.findMany({
    where: { companyId },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, email: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function addMemberToCompany(params: {
  companyId: string;
  userId: string;
  role: MembershipRole;
}) {
  const prisma = getPrisma();

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { id: true },
  });
  if (!company) throw new HttpError("Empresa no encontrada", 404, "COMPANY_NOT_FOUND");

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });
  if (!user) throw new HttpError("Usuario no encontrado", 404, "USER_NOT_FOUND");

  try {
    const membership = await prisma.companyUser.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        role: params.role,
      },
      select: { userId: true, role: true, createdAt: true },
    });
    return membership;
  } catch {
    throw new HttpError("El usuario ya es miembro de la empresa", 409, "MEMBERSHIP_EXISTS");
  }
}

export async function updateMemberRole(params: {
  companyId: string;
  userId: string;
  role: MembershipRole;
}) {
  const prisma = getPrisma();

  const current = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: params.userId, companyId: params.companyId } },
    select: { role: true },
  });
  if (!current) throw new HttpError("Membresía no encontrada", 404, "MEMBERSHIP_NOT_FOUND");

  if (current.role === params.role) return { ok: true };

  // Regla de negocio: no permitir que la empresa quede sin al menos un OWNER.
  if (current.role === "OWNER" && params.role !== "OWNER") {
    const ownersCount = await prisma.companyUser.count({
      where: { companyId: params.companyId, role: "OWNER" },
    });
    if (ownersCount <= 1) {
      throw new HttpError("No puedes eliminar el último OWNER", 400, "LAST_OWNER");
    }
  }

  await prisma.companyUser.update({
    where: { userId_companyId: { userId: params.userId, companyId: params.companyId } },
    data: { role: params.role },
  });

  return { ok: true };
}

export async function removeMemberFromCompany(params: { companyId: string; userId: string }) {
  const prisma = getPrisma();

  const current = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: params.userId, companyId: params.companyId } },
    select: { role: true },
  });
  if (!current) throw new HttpError("Membresía no encontrada", 404, "MEMBERSHIP_NOT_FOUND");

  if (current.role === "OWNER") {
    const ownersCount = await prisma.companyUser.count({
      where: { companyId: params.companyId, role: "OWNER" },
    });
    if (ownersCount <= 1) {
      throw new HttpError("No puedes eliminar el último OWNER", 400, "LAST_OWNER");
    }
  }

  await prisma.companyUser.delete({
    where: { userId_companyId: { userId: params.userId, companyId: params.companyId } },
  });

  return { ok: true };
}

