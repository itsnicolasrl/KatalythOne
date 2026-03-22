import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { requireSameOrigin } from "@/src/api/http/originCheck";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { verifyPassword } from "@/src/lib/auth/password";
import { HttpError } from "@/src/lib/errors/HttpError";

const bodySchema = z.object({
  password: z.string().min(6).max(120),
  confirmation: z.string(),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `account-delete:${user.id}:${getClientIp(req)}`,
      max: 5,
      windowMs: 60 * 60 * 1000,
    });

    const body = bodySchema.parse(await req.json().catch(() => ({})));
    if (body.confirmation.trim().toUpperCase() !== "ELIMINAR") {
      throw new HttpError(
        "Debes escribir ELIMINAR para confirmar",
        400,
        "DELETE_CONFIRMATION_INVALID",
      );
    }

    const prisma = getPrisma();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!dbUser) throw new HttpError("Usuario no encontrado", 404, "USER_NOT_FOUND");

    const isValid = await verifyPassword(body.password, dbUser.passwordHash);
    if (!isValid) {
      throw new HttpError("Contraseña incorrecta", 400, "PASSWORD_INVALID");
    }

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountDeletionRequestedAt: new Date(),
        accountDeletionScheduledFor: scheduledFor,
      },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      scheduledFor: scheduledFor.toISOString(),
      message:
        "Tu cuenta quedó programada para eliminación en 30 días. Puedes recuperarla iniciando sesión y usando recuperación de cuenta.",
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
