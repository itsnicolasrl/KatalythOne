import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { requireSameOrigin } from "@/src/api/http/originCheck";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { verifyPassword } from "@/src/lib/auth/password";
import { HttpError } from "@/src/lib/errors/HttpError";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmation: z.string(),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    enforceRateLimit({
      key: `account-recover:${getClientIp(req)}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
    });

    const body = bodySchema.parse(await req.json().catch(() => ({})));
    if (body.confirmation.trim().toUpperCase() !== "RECUPERAR") {
      throw new HttpError(
        "Debes escribir RECUPERAR para restaurar la cuenta",
        400,
        "RECOVER_CONFIRMATION_INVALID",
      );
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      select: {
        id: true,
        passwordHash: true,
        accountDeletionScheduledFor: true,
      },
    });
    if (!user) throw new HttpError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) throw new HttpError("Credenciales inválidas", 401, "INVALID_CREDENTIALS");

    if (!user.accountDeletionScheduledFor) {
      throw new HttpError("Esta cuenta no está en proceso de eliminación", 400, "ACCOUNT_NOT_PENDING_DELETION");
    }
    if (user.accountDeletionScheduledFor.getTime() <= Date.now()) {
      throw new HttpError("El plazo de recuperación expiró", 410, "ACCOUNT_RECOVERY_EXPIRED");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountDeletionRequestedAt: null,
        accountDeletionScheduledFor: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Cuenta recuperada correctamente." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
