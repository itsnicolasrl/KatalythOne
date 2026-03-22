import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { requireSameOrigin } from "@/src/api/http/originCheck";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";

const profileSchema = z.object({
  fullName: z.string().max(120).optional().transform((v) => (v?.trim() ? v.trim() : null)),
  avatarUrl: z.string().max(500).optional().transform((v) => (v?.trim() ? v.trim() : null)),
  phone: z.string().max(40).optional().transform((v) => (v?.trim() ? v.trim() : null)),
  addressLine1: z.string().max(200).optional().transform((v) => (v?.trim() ? v.trim() : null)),
  city: z.string().max(100).optional().transform((v) => (v?.trim() ? v.trim() : null)),
  country: z.string().max(100).optional().transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function GET() {
  try {
    const user = await requireUser();
    const prisma = getPrisma();
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        addressLine1: true,
        city: true,
        country: true,
      },
    });
    return NextResponse.json({ profile: row });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `profile:${user.id}:${getClientIp(req)}`,
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    const body = profileSchema.parse(await req.json().catch(() => ({})));
    const prisma = getPrisma();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        addressLine1: true,
        city: true,
        country: true,
      },
    });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
