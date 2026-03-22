import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createProject, listProjects } from "@/src/services/projects/projectsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(0).max(1000).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.read",
    });

    const projects = await listProjects({ companyId: company.id });
    return NextResponse.json({ projects });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.manage",
    });

    const body = createSchema.parse(await req.json());
    const project = await createProject({
      companyId: company.id,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      createdByUserId: user.id,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

