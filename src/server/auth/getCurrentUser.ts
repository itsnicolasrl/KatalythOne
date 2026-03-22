import { cookies } from "next/headers";
import { getPrisma } from "@/src/db/prisma";
import { env } from "@/src/lib/env";
import { verifyAccessToken } from "@/src/lib/auth/jwt";

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const prisma = getPrisma();
    const payload = verifyAccessToken(token);
    try {
      return await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          accountDeletionScheduledFor: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
          addressLine1: true,
          city: true,
          country: true,
          createdAt: true,
        },
      });
    } catch {
      // Compatibilidad temporal cuando el cliente Prisma en runtime aún no refleja
      // campos nuevos. Evita bloquear sesión mientras se sincroniza entorno.
      const legacyUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
          addressLine1: true,
          city: true,
          country: true,
          createdAt: true,
        },
      });
      if (!legacyUser) return null;
      return {
        ...legacyUser,
        accountDeletionScheduledFor: null as Date | null,
      };
    }
  } catch {
    return null;
  }
}

