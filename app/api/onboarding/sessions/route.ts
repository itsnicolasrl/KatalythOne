import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { createOnboardingSession } from "@/src/services/onboarding/sessionService";
import { getQuestion } from "@/src/services/onboarding/onboardingQuestions";
import type { OnboardingStepKey } from "@/src/services/onboarding/onboardingTypes";
import { getPrisma } from "@/src/db/prisma";

const bodySchema = z
  .object({
    mode: z.enum(["NEW", "EXISTING"]).optional(),
    companyId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(req: Request) {
  const user = await requireUser();
  const body = bodySchema.parse(await req.json().catch(() => undefined));

  let mode = body?.mode;
  let companyId: string | undefined;
  let initialStepKey: OnboardingStepKey | undefined;

  if (mode === "EXISTING" && body?.companyId) {
    const prisma = getPrisma();
    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: body.companyId } },
      select: { companyId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso a esa empresa" }, { status: 403 });
    }
    companyId = body.companyId;
    initialStepKey = "WHAT_DOES_COMPANY_DO";
  }

  const session = await createOnboardingSession({
    userId: user.id,
    mode,
    companyId,
    stepKey: initialStepKey,
  });

  const currentStepKey = session.stepKey as OnboardingStepKey;
  const question = getQuestion({ stepKey: currentStepKey, mode: session.mode });

  return NextResponse.json({
    sessionId: session.id,
    question,
  });
}

