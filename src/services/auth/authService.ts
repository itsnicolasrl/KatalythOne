import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";

export type RegisterInput = {
  email: string;
  password: string;
};

export async function register(input: RegisterInput) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new HttpError("El email ya está registrado", 409, "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
    },
    select: { id: true, email: true },
  });

  return user;
}

export type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new HttpError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
  }

  if (user.accountDeletionScheduledFor && user.accountDeletionScheduledFor.getTime() > Date.now()) {
    throw new HttpError(
      "Tu cuenta está en período de recuperación (30 días). Puedes restaurarla ahora.",
      403,
      "ACCOUNT_PENDING_DELETION",
    );
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");
  }

  return { userId: user.id };
}

