import { getPrisma } from "@/src/db/prisma";
import type { OnboardingMode, OnboardingStepKey } from "@/src/services/onboarding/onboardingTypes";
import type { Prisma } from "@/src/generated/prisma";

export async function createOnboardingSession(params: {
  userId: string;
  mode?: OnboardingMode;
  companyId?: string | null;
  stepKey?: OnboardingStepKey;
}) {
  const prisma = getPrisma();
  const mode = params.mode ?? "NEW";
  const stepKey = params.stepKey ?? "CHOOSE_COMPANY_MODE";
  const session = await prisma.onboardingSession.create({
    data: {
      userId: params.userId,
      mode,
      companyId: params.companyId ?? null,
      stepKey,
    },
    select: { id: true, stepKey: true, mode: true, status: true, companyId: true },
  });

  return session;
}

export async function getOnboardingSessionForUser(params: {
  sessionId: string;
  userId: string;
}) {
  const prisma = getPrisma();
  const session = await prisma.onboardingSession.findFirst({
    where: { id: params.sessionId, userId: params.userId },
    include: { answers: true, company: true },
  });
  return session;
}

export async function upsertOnboardingAnswer(params: {
  sessionId: string;
  stepKey: OnboardingStepKey;
  value: unknown;
}) {
  const prisma = getPrisma();
  const answer = await prisma.onboardingAnswer.upsert({
    where: {
      sessionId_stepKey: {
        sessionId: params.sessionId,
        stepKey: params.stepKey,
      },
    },
    update: { value: params.value as Prisma.InputJsonValue },
    create: {
      sessionId: params.sessionId,
      stepKey: params.stepKey,
      value: params.value as Prisma.InputJsonValue,
    },
  });

  return answer;
}

