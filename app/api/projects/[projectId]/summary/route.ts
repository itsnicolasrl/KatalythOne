import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getProjectSummary } from "@/src/services/projects/projectSummaryService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  _req: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    const params = await context.params;
    z.string().min(1).parse(params.projectId);

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.read",
    });

    const summary = await getProjectSummary({ companyId: company.id, projectId: params.projectId });
    return NextResponse.json({ summary });
  } catch (err) {
    return toErrorResponse(err);
  }
}

