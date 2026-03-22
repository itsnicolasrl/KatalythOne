import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerAnyCompany } from "@/src/api/auth/requireOwnerAnyCompany";
import { createPermission, listPermissions } from "@/src/services/permissions/permissionsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const bodySchema = z.object({
  key: z.string().min(3).max(120),
  description: z.string().min(0).max(500).optional(),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireOwnerAnyCompany();
    // Rate limit por IP, ya que este endpoint no tiene userId directamente.
    enforceRateLimit({
      key: `perm:${getClientIp(req)}`,
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    const body = bodySchema.parse(await req.json());

    const permission = await createPermission({
      key: body.key,
      description: body.description,
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET() {
  try {
    await requireOwnerAnyCompany();
    const permissions = await listPermissions();
    return NextResponse.json({ permissions });
  } catch (err) {
    return toErrorResponse(err);
  }
}

