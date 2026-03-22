import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const user = await requireUser();
    const { companyId } = await context.params;
    const body = updateSchema.parse(await req.json());
    const prisma = getPrisma();

    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 });
    }
    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para editar esta empresa" },
        { status: 403 },
      );
    }

    const data: { name?: string; logoUrl?: string | null } = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
      select: { id: true, name: true, logoUrl: true, createdAt: true },
    });

    return NextResponse.json({ company });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const user = await requireUser();
    const { companyId } = await context.params;
    const prisma = getPrisma();

    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 });
    }
    if (membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Solo el propietario puede eliminar la empresa" },
        { status: 403 },
      );
    }

    await prisma.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
