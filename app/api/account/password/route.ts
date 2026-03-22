import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { requireSameOrigin } from "@/src/api/http/originCheck";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";
import { HttpError } from "@/src/lib/errors/HttpError";

const bodySchema = z.object({
  currentPassword: z.string().min(6).max(120),
  newPassword: z.string().min(8).max(120),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `password:${user.id}:${getClientIp(req)}`,
      max: 8,
      windowMs: 60 * 60 * 1000,
    });
    const body = bodySchema.parse(await req.json().catch(() => ({})));
    const prisma = getPrisma();
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!row) throw new HttpError("Usuario no encontrado", 404, "USER_NOT_FOUND");

    const valid = await verifyPassword(body.currentPassword, row.passwordHash);
    if (!valid) {
      throw new HttpError("La contraseña actual no coincide", 400, "PASSWORD_INVALID");
    }
    if (body.currentPassword === body.newPassword) {
      throw new HttpError("La nueva contraseña debe ser diferente", 400, "PASSWORD_SAME");
    }

    const newHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
