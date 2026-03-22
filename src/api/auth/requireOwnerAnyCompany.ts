import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { HttpError } from "@/src/lib/errors/HttpError";
import { getPrisma } from "@/src/db/prisma";

export async function requireOwnerAnyCompany() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("No autorizado", 401, "UNAUTHORIZED");

  const prisma = getPrisma();
  const ownerMembership = await prisma.companyUser.findFirst({
    where: { userId: user.id, role: "OWNER" },
    select: { companyId: true },
  });

  if (!ownerMembership) {
    throw new HttpError("Solo OWNER puede gestionar permisos", 403, "FORBIDDEN");
  }
}

