import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerAnyCompany } from "@/src/api/auth/requireOwnerAnyCompany";
import { listRolePermissions, setRolePermission } from "@/src/services/permissions/permissionsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const bodySchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  permissionKey: z.string().min(3).max(120),
  allowed: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    await requireOwnerAnyCompany();
    enforceRateLimit({
      key: `roleperm:${getClientIp(req)}`,
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    const body = bodySchema.parse(await req.json());

    await setRolePermission({
      role: body.role,
      permissionKey: body.permissionKey,
      allowed: body.allowed,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(req: Request) {
  try {
    // /api/role-permissions?role=ADMIN
    const url = new URL(req.url);
    const roleParam = url.searchParams.get("role");
    const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
    const role = roleSchema.parse(roleParam);

    await requireOwnerAnyCompany();
    const rows = await listRolePermissions({ role });

    return NextResponse.json({ rows });
  } catch (err) {
    return toErrorResponse(err);
  }
}

