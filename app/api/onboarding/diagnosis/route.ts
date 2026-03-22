import { NextResponse } from "next/server";
import { requireUser } from "@/src/api/auth/requireUser";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { getStrategicOnboardingAnalysis } from "@/src/services/onboarding/analysisService";

export async function GET() {
  try {
    await requireUser();
    const activeCompany = await getActiveCompanyForRequest();
    if (!activeCompany) {
      return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    }

    const prisma = getPrisma();
    const profile = await prisma.companyOnboardingProfile.findUnique({
      where: { companyId: activeCompany.id },
      select: {
        companyType: true,
        businessModel: true,
        problems: true,
        opportunities: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Diagnóstico no generado aún" }, { status: 404 });
    }

    const strategicAnalysis = await getStrategicOnboardingAnalysis(activeCompany.id);

    return NextResponse.json({
      companyId: activeCompany.id,
      diagnosis: {
        companyType: profile.companyType,
        businessModel: profile.businessModel,
        initialProblems: profile.problems,
        opportunities: profile.opportunities,
      },
      strategicAnalysis,
      generatedAt: profile.updatedAt,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

