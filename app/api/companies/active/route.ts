import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { env } from "@/src/lib/env";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";
import { ACTIVE_COMPANY_COOKIE_NAME } from "@/src/lib/company/activeCompanyCookie";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  companyId: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();

    const body = bodySchema.parse(await req.json());

    const membership = await prisma.companyUser.findFirst({
      where: { userId: user.id, companyId: body.companyId },
      select: { companyId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso a esa empresa" },
        { status: 403 },
      );
    }

    const res = NextResponse.json({ ok: true });
    const maxAgeSeconds = parseExpiresInToSeconds(env.AUTH_REFRESH_EXPIRES_IN);

    res.cookies.set(ACTIVE_COMPANY_COOKIE_NAME, body.companyId, {
      httpOnly: true,
      secure: env.AUTH_COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds ?? undefined,
    });

    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}

