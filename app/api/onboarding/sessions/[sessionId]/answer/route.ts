import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";

import { getQuestion } from "@/src/services/onboarding/onboardingQuestions";
import type { OnboardingStepKey } from "@/src/services/onboarding/onboardingTypes";
import { getNextStep } from "@/src/services/onboarding/onboardingStepOrder";
import {
  parseParsedListItems,
} from "@/src/services/onboarding/parsers";

import { upsertOnboardingAnswer, getOnboardingSessionForUser } from "@/src/services/onboarding/sessionService";
import { generateCompanyFromOnboardingSession } from "@/src/services/onboarding/generationService";
import { listCompaniesForUser } from "@/src/services/companies/companyService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  answer: z.unknown(),
});

function parseStringAnswer(input: unknown, step: string, opts?: { min?: number; max?: number }): string {
  const s = z
    .string()
    .min(opts?.min ?? 3)
    .max(opts?.max ?? 4000)
    .parse(input);
  if (s.trim().length < 1) throw new Error(`Respuesta inválida en ${step}`);
  return s.trim();
}

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();

    const { sessionId } = await context.params;

    const session = await getOnboardingSessionForUser({
      sessionId,
      userId: user.id,
    });

    if (!session || session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const currentStep = session.stepKey as OnboardingStepKey;
    const body = bodySchema.parse(await req.json());
    const answerValue = body.answer;

    // Parseo y guardado de respuesta según el paso actual.
    let storedValue: unknown;
    let nextStep: OnboardingStepKey | null = null;

    switch (currentStep) {
    case "CHOOSE_COMPANY_MODE": {
      const mode = z
        .string()
        .transform((v) => v.toUpperCase())
        .pipe(z.enum(["NEW", "EXISTING"]))
        .parse(answerValue);

      storedValue = { mode };
      nextStep = getNextStep({ current: currentStep, mode });

      await prisma.onboardingSession.update({
        where: { id: sessionId },
        data: { mode, stepKey: nextStep ?? currentStep },
      });
      break;
    }

    case "COMPANY_NAME": {
      if (session.mode !== "NEW") {
        return NextResponse.json(
          { error: "Este paso no aplica para una empresa existente" },
          { status: 400 },
        );
      }
      const companyName = parseStringAnswer(answerValue, currentStep, { min: 2, max: 120 });
      storedValue = { text: companyName };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "COMPANY_PICK": {
      if (session.mode !== "EXISTING") {
        return NextResponse.json(
          { error: "Este paso no aplica para una empresa nueva" },
          { status: 400 },
        );
      }

      const companyId = z.string().min(1).parse(answerValue);

      const membership = await prisma.companyUser.findUnique({
        where: { userId_companyId: { userId: user.id, companyId } },
        select: { role: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "No tienes membresía en esa empresa" },
          { status: 403 },
        );
      }

      storedValue = { companyId };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });

      await prisma.onboardingSession.update({
        where: { id: sessionId },
        data: { companyId, stepKey: nextStep ?? currentStep },
      });
      break;
    }

    case "WHAT_DOES_COMPANY_DO": {
      const text = parseStringAnswer(answerValue, currentStep, { min: 3, max: 4000 });
      storedValue = { text };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }
    case "BUSINESS_STAGE":
    case "YEARS_OPERATING":
    case "TEAM_SIZE":
    case "CURRENT_CLIENT_TYPE":
    case "ACTIVE_CLIENTS":
    case "TOP_CLIENT_CONCENTRATION":
    case "MONTHLY_INCOME_RANGE":
    case "MONTHLY_EXPENSE_RANGE":
    case "MATURITY_LEVEL": {
      const value = parseStringAnswer(answerValue, currentStep, { min: 1, max: 120 });
      storedValue = { value };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "WHAT_OFFERS": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de ofertas vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Ofertas inválidas" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "TARGET_CUSTOMER": {
      const text = parseStringAnswer(answerValue, currentStep, { min: 3, max: 4000 });
      storedValue = { text };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "BUSINESS_FLOW": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de flujo vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Flujo inválido" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "INCOME_STREAMS": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de ingresos vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Ingresos inválidos" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "EXPENSE_CATEGORIES": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de gastos vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Gastos inválidos" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

    case "PROBLEMS": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de problemas vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Problemas inválidos" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }
    case "GOALS": {
      const raw = parseStringAnswer(answerValue, currentStep, { min: 1, max: 8000 });
      const items = parseParsedListItems(raw);
      if (!items.length) {
        return NextResponse.json(
          { error: "Lista de objetivos vacía" },
          { status: 400 },
        );
      }
      const safeItems = items.filter((i) => i.name.length > 0 && i.name.length <= 120);
      if (!safeItems.length) {
        return NextResponse.json({ error: "Objetivos inválidos" }, { status: 400 });
      }
      storedValue = { items: safeItems };
      nextStep = getNextStep({ current: currentStep, mode: session.mode });
      break;
    }

      default:
        return NextResponse.json({ error: "Paso no soportado" }, { status: 400 });
    }

    await upsertOnboardingAnswer({
      sessionId,
      stepKey: currentStep,
      value: storedValue,
    });

    // Si el siguiente step es null => completamos + generamos.
    if (!nextStep) {
      await prisma.onboardingSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date(), stepKey: currentStep },
      });

      await generateCompanyFromOnboardingSession({ sessionId });

      const updated = await prisma.onboardingSession.findUnique({
        where: { id: sessionId },
        select: { companyId: true },
      });

      return NextResponse.json({
        completed: true,
        companyId: updated?.companyId,
        sessionId,
      });
    }

    // Avanzamos el step si no hicimos update en el switch (modo/pick lo actualizamos ahí).
    const shouldSkipStepUpdate =
      currentStep === "CHOOSE_COMPANY_MODE" || currentStep === "COMPANY_PICK";
    if (!shouldSkipStepUpdate) {
      await prisma.onboardingSession.update({
        where: { id: sessionId },
        data: { stepKey: nextStep },
      });
    }

    // Construimos la siguiente pregunta con inputs dinámicos.
    let question = getQuestion({ stepKey: nextStep });
    if (nextStep === "COMPANY_PICK") {
      const companies = await listCompaniesForUser(user.id);
      question = {
        ...question,
        input: {
          type: "select",
          options: companies.map((c) => ({
            label: c.company.name,
            value: c.companyId,
          })),
        },
      };
    }

    return NextResponse.json({ sessionId, question });
  } catch (err) {
    if (err instanceof Error && err.message.includes("OnboardingStepKey")) {
      return NextResponse.json(
        {
          error:
            "Tu base de datos aún no está sincronizada con los pasos nuevos del onboarding. Ejecuta `npx prisma db push` y vuelve a intentarlo.",
        },
        { status: 500 },
      );
    }
    return toErrorResponse(err);
  }
}

