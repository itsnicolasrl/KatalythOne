import { NextResponse } from "next/server";
import { requireUser } from "@/src/api/auth/requireUser";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { runDiagnosticsForLatestSnapshot } from "@/src/services/diagnostics/diagnosticsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function POST() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) {
      return NextResponse.json(
        { error: "No hay empresa activa" },
        { status: 400 },
      );
    }

    const result = await runDiagnosticsForLatestSnapshot(company.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return toErrorResponse(err);
  }
}

