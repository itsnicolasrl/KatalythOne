import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { sanitizePermissionKey, sanitizeText } from "@/src/lib/sanitize";

export type PermissionInput = {
  key: string;
  description?: string;
};

export type RolePermissionInput = {
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissionKey: string;
  allowed: boolean;
};

export async function createPermission(input: PermissionInput) {
  const prisma = getPrisma();
  const key = sanitizePermissionKey(input.key);
  if (!key) throw new HttpError("Clave de permiso requerida", 400, "PERMISSION_KEY_REQUIRED");

  try {
    return prisma.permission.create({
      data: {
        key,
        description: input.description ? sanitizeText(input.description, { maxLen: 500 }) : undefined,
      },
      select: { id: true, key: true, description: true, createdAt: true },
    });
  } catch {
    // Si ya existe por unique(key), devolvemos error semántico.
    throw new HttpError("El permiso ya existe", 409, "PERMISSION_EXISTS");
  }
}

export async function setRolePermission(input: RolePermissionInput) {
  const prisma = getPrisma();
  const permissionKey = sanitizePermissionKey(input.permissionKey);
  if (!permissionKey) {
    throw new HttpError("permissionKey requerida", 400, "PERMISSION_KEY_REQUIRED");
  }

  const permission = await prisma.permission.findUnique({
    where: { key: permissionKey },
    select: { id: true },
  });
  if (!permission) {
    throw new HttpError("Permiso no existe", 404, "PERMISSION_NOT_FOUND");
  }

  // upsert por clave compuesta (role, permissionId)
  // Prisma requiere update + create con los mismos campos.
  await prisma.rolePermission.upsert({
    where: {
      role_permissionId: {
        role: input.role,
        permissionId: permission.id,
      },
    },
    update: { allowed: input.allowed },
    create: {
      role: input.role,
      permissionId: permission.id,
      allowed: input.allowed,
    },
  });

  return { ok: true };
}

export async function checkCompanyPermission(params: {
  userId: string;
  companyId: string;
  permissionKey: string;
}): Promise<boolean> {
  const prisma = getPrisma();
  const roleMembership = await prisma.companyUser.findUnique({
    where: {
      userId_companyId: {
        userId: params.userId,
        companyId: params.companyId,
      },
    },
    select: { role: true },
  });

  if (!roleMembership) return false;
  if (roleMembership.role === "OWNER") return true;

  const permission = await prisma.permission.findUnique({
    where: { key: params.permissionKey.trim() },
    select: { id: true },
  });
  if (!permission) return false;

  const mapping = await prisma.rolePermission.findUnique({
    where: {
      role_permissionId: {
        role: roleMembership.role,
        permissionId: permission.id,
      },
    },
    select: { allowed: true },
  });

  return Boolean(mapping?.allowed);
}

export async function listCompanyMembershipRoles(params: { companyId: string }) {
  const prisma = getPrisma();
  return prisma.companyUser.findMany({
    where: { companyId: params.companyId },
    select: { userId: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRolePermissions(params: { role: RolePermissionInput["role"] }) {
  const prisma = getPrisma();
  // permission.key es estable para el frontend.
  return prisma.rolePermission.findMany({
    where: { role: params.role },
    select: {
      allowed: true,
      permission: { select: { key: true, description: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPermissions() {
  const prisma = getPrisma();
  return prisma.permission.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, key: true, description: true, createdAt: true },
  });
}

