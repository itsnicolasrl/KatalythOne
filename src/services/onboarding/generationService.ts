import { getPrisma } from "@/src/db/prisma";
import type { OnboardingMode, OnboardingStepKey } from "@/src/services/onboarding/onboardingTypes";
import type { ParsedListItem } from "@/src/services/onboarding/onboardingTypes";
import { createCompany } from "@/src/services/companies/companyService";

const GENERATED_PROCESS_DESCRIPTION = "GENERADO_DESDE_ONBOARDING";

function inferCompanyType(params: {
  whatCompanyDoes: string;
  offers: ParsedListItem[];
}) {
  const normalizedOffers = params.offers.map((o) => o.name.trim()).filter(Boolean);
  if (normalizedOffers.length > 0) {
    const sorted = [...normalizedOffers].sort((a, b) => b.length - a.length);
    const candidate = sorted[0];
    return candidate.length <= 80 ? candidate : `${candidate.slice(0, 77)}...`;
  }

  const trimmed = params.whatCompanyDoes.trim();
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77)}...`;
}

function severityFromProblem(problem: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const p = problem.toLowerCase();
  const high = ["rentabilidad", "margen", "margen bruto", "precio", "costos", "costos", "gastos", "crisis"];
  const medium = ["cliente", "clientes", "venta", "ventas", "cobran", "pago", "demanda", "pipeline"];
  const critical = ["riesgo", "incumplimiento", "quiebra"];

  if (critical.some((k) => p.includes(k))) return "CRITICAL";
  if (high.some((k) => p.includes(k))) return "HIGH";
  if (medium.some((k) => p.includes(k))) return "MEDIUM";
  return "LOW";
}

function buildProblemAndOpportunity(params: {
  problems: string[];
  whatCompanyDoes: string;
  targetCustomer: string;
  offers: ParsedListItem[];
  businessFlowSteps: string[];
  incomeStreams: ParsedListItem[];
  expenseCategories: ParsedListItem[];
  topClientConcentration: string;
  maturityLevel: string;
  monthlyIncomeRange: string;
  monthlyExpenseRange: string;
  goals: string[];
}) {
  const flow = params.businessFlowSteps.join(" -> ");
  const incomeNames = params.incomeStreams.map((x) => x.name).filter(Boolean);
  const expenseNames = params.expenseCategories.map((x) => x.name).filter(Boolean);

  const problemsDetailed = params.problems.map((p) => {
    const severity = severityFromProblem(p);
    const description =
      p.length > 140
        ? p.slice(0, 140) + "..."
        : p;

    const message = `Según tus respuestas, el problema inicial prioritario es: "${p}". ` +
      `Este riesgo puede afectar la estabilidad de ingresos y/o costos dentro de tu flujo: ${flow}.`;

    return {
      title: p,
      description,
      severity,
      message,
    };
  });

  if (params.topClientConcentration === ">70" || params.topClientConcentration === "50-70") {
    problemsDetailed.push({
      title: "Dependencia de cliente principal",
      description: "Concentración elevada de ingresos en un solo cliente.",
      severity: params.topClientConcentration === ">70" ? "CRITICAL" : "HIGH",
      message:
        "La concentración de ingresos en un cliente aumenta el riesgo de inestabilidad del flujo de caja ante cualquier cancelación o retraso.",
    });
  }

  if (params.maturityLevel === "LOW") {
    problemsDetailed.push({
      title: "Baja madurez operativa",
      description: "Operación informal con procesos y métricas poco definidos.",
      severity: "HIGH",
      message:
        "La falta de procesos definidos dificulta escalar, medir desempeño y anticipar problemas operativos y financieros.",
    });
  }

  if (params.monthlyIncomeRange === "<1000" && params.monthlyExpenseRange !== "<1000") {
    problemsDetailed.push({
      title: "Presión financiera inicial",
      description: "Gastos operativos altos en relación con el nivel de ingresos.",
      severity: "HIGH",
      message:
        "La estructura actual sugiere tensión de caja. Es prioritario ajustar costos y/o acelerar generación de ingresos recurrentes.",
    });
  }

  const opportunitiesDetailed = problemsDetailed.map((pr) => {
    const firstStep = params.businessFlowSteps[0] ?? "tu operación";
    const lastStep =
      params.businessFlowSteps[params.businessFlowSteps.length - 1] ??
      "el cierre";

    const impactIncome = incomeNames[0] ?? "tus ingresos";
    const impactExpense = expenseNames[0] ?? "tus gastos";

    const actionPlan = `Plan inicial para "${pr.title}":\n` +
      `1) Define 1 KPI para "${pr.title}" (medible con tus ingresos/gastos).\n` +
      `2) Revisa el proceso de "${firstStep}" a "${lastStep}" e identifica el punto donde se origina el problema.\n` +
      `3) Ajusta palancas del modelo: impacta "${impactIncome}" y/o "${impactExpense}" según tu contexto.\n` +
      `4) Establece una cadencia semanal para capturar datos reales y recalcular métricas.`;

    const rationale =
      `Si se reduce "${pr.title}", el modelo digital puede generar alertas más tempranas y recomendaciones accionables. ` +
      `Tu propuesta ("${params.whatCompanyDoes}") y tu cliente objetivo ("${params.targetCustomer}") dan contexto para que el ajuste sea coherente.`;

    return {
      title: `Oportunidad: ${pr.title}`,
      rationale,
      actionPlan,
    };
  });

  params.goals.forEach((goal) => {
    opportunitiesDetailed.push({
      title: `Objetivo estratégico: ${goal}`,
      rationale:
        `Este objetivo puede ejecutarse con mayor probabilidad de éxito si se vincula a indicadores semanales de ventas, rentabilidad y avance operativo.`,
      actionPlan:
        `Plan sugerido para "${goal}":\n` +
        "1) Definir métrica principal de éxito.\n" +
        "2) Diseñar 2 acciones concretas de ejecución semanal.\n" +
        "3) Revisar avances cada 7 días y recalibrar decisiones con datos reales.",
    });
  });

  return { problemsDetailed, opportunitiesDetailed };
}

function assertNonEmptyArray<T>(arr: T[], message: string): T[] {
  if (!arr.length) throw new Error(message);
  return arr;
}

export async function generateCompanyFromOnboardingSession(params: {
  sessionId: string;
}) {
  const prisma = getPrisma();

  const session = await prisma.onboardingSession.findFirst({
    where: { id: params.sessionId },
    include: {
      answers: true,
    },
  });

  if (!session) throw new Error("Onboarding session no encontrada");
  if (session.status !== "COMPLETED") {
    // Lo generamos al completar; si se llama antes, lo consideramos error.
    throw new Error("La sesión no está completada");
  }

  const answersByStep = new Map(
    session.answers.map((a) => [a.stepKey, a.value]),
  );

  const mode = session.mode as OnboardingMode;

  const isRecord = (v: unknown): v is Record<string, unknown> => {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  };

  const getText = (step: OnboardingStepKey): string => {
    const v = answersByStep.get(step);
    if (!v) return "";
    if (typeof v === "string") return v;
    if (isRecord(v) && typeof v.text === "string") return v.text;
    return "";
  };

  const getScalarValue = (step: OnboardingStepKey): string => {
    const v = answersByStep.get(step);
    if (!v) return "";
    if (typeof v === "string") return v;
    if (isRecord(v) && typeof v.value === "string") return v.value;
    return "";
  };

  const getListItems = (step: OnboardingStepKey): ParsedListItem[] => {
    const v = answersByStep.get(step);
    if (!v) return [];
    if (Array.isArray(v)) return v as ParsedListItem[];
    if (isRecord(v) && Array.isArray(v.items)) return v.items as ParsedListItem[];
    return [];
  };

  const whatCompanyDoes = getText("WHAT_DOES_COMPANY_DO");
  const targetCustomer = getText("TARGET_CUSTOMER");

  const offers = getListItems("WHAT_OFFERS");
  const businessFlowSteps = getListItems("BUSINESS_FLOW").map((x) => x.name);

  const incomeStreams = getListItems("INCOME_STREAMS");
  const expenseCategories = getListItems("EXPENSE_CATEGORIES");

  const problems = getListItems("PROBLEMS").map((x) => x.name);
  const goals = getListItems("GOALS").map((x) => x.name);

  const businessStage = getScalarValue("BUSINESS_STAGE");
  const yearsOperating = getScalarValue("YEARS_OPERATING");
  const teamSize = getScalarValue("TEAM_SIZE");
  const currentClientType = getScalarValue("CURRENT_CLIENT_TYPE");
  const activeClients = getScalarValue("ACTIVE_CLIENTS");
  const topClientConcentration = getScalarValue("TOP_CLIENT_CONCENTRATION");
  const monthlyIncomeRange = getScalarValue("MONTHLY_INCOME_RANGE");
  const monthlyExpenseRange = getScalarValue("MONTHLY_EXPENSE_RANGE");
  const maturityLevel = getScalarValue("MATURITY_LEVEL");

  let companyId: string | null = session.companyId;
  if (!whatCompanyDoes.trim()) throw new Error("Falta WHAT_DOES_COMPANY_DO");
  if (!targetCustomer.trim()) throw new Error("Falta TARGET_CUSTOMER");
  if (mode === "NEW") {
    const companyName = getText("COMPANY_NAME");
    if (!companyName.trim()) throw new Error("Falta COMPANY_NAME");

    // Crea empresa + membership OWNER real (no hardcodeado).
    const company = await createCompany({ userId: session.userId, name: companyName });
    await prisma.onboardingSession.update({
      where: { id: session.id },
      data: { companyId: company.id },
    });
    companyId = company.id;
  }

  if (!companyId) throw new Error("companyId no resuelto");

  const offersSafe = assertNonEmptyArray(offers, "Se requieren ofertas");
  const flowSafe = assertNonEmptyArray(businessFlowSteps, "Se requiere flujo del negocio");
  const incomeSafe = assertNonEmptyArray(incomeStreams, "Se requieren ingresos");
  const expensesSafe = assertNonEmptyArray(expenseCategories, "Se requieren gastos");
  const problemsSafe = assertNonEmptyArray(problems, "Se requieren problemas");

  const companyType = inferCompanyType({ whatCompanyDoes, offers: offersSafe });

  const { problemsDetailed, opportunitiesDetailed } = buildProblemAndOpportunity({
    problems: problemsSafe,
    whatCompanyDoes,
    targetCustomer,
    offers: offersSafe,
    businessFlowSteps: flowSafe,
    incomeStreams: incomeSafe,
    expenseCategories: expensesSafe,
    topClientConcentration,
    maturityLevel,
    monthlyIncomeRange,
    monthlyExpenseRange,
    goals,
  });

  const businessModel = {
    valueProposition: whatCompanyDoes,
    offers: offersSafe,
    targetCustomer,
    keyActivities: flowSafe,
    revenueModel: incomeSafe,
    costModel: expensesSafe,
    businessStage,
    yearsOperating,
    teamSize,
    customerType: currentClientType,
    activeClients,
    topClientConcentration,
    monthlyIncomeRange,
    monthlyExpenseRange,
    maturityLevel,
    goals,
    // Diagnóstico inicial desde onboarding (estructura usada por el producto)
    initialProblems: problemsDetailed.map((p) => ({
      title: p.title,
      severity: p.severity,
      description: p.description,
    })),
    opportunities: opportunitiesDetailed.map((o) => ({
      title: o.title,
    })),
  };

  await prisma.$transaction(async (tx) => {
    await tx.revenueStreamTemplate.deleteMany({ where: { companyId } });
    await tx.expenseCategoryTemplate.deleteMany({ where: { companyId } });

    // Upsert de perfil: reemplaza el modelo digital inicial.
    await tx.companyOnboardingProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        companyType,
        businessModel,
        whatCompanyDoes,
        offers: offersSafe,
        targetCustomer,
        businessFlowSteps: flowSafe,
        incomeStreams: incomeSafe,
        expenseCategories: expensesSafe,
        problems: problemsDetailed,
        opportunities: opportunitiesDetailed,
      },
      update: {
        companyType,
        businessModel,
        whatCompanyDoes,
        offers: offersSafe,
        targetCustomer,
        businessFlowSteps: flowSafe,
        incomeStreams: incomeSafe,
        expenseCategories: expensesSafe,
        problems: problemsDetailed,
        opportunities: opportunitiesDetailed,
      },
    });

    await tx.revenueStreamTemplate.createMany({
      data: incomeSafe.map((i) => ({ companyId, name: i.name, description: i.description })),
    });
    await tx.expenseCategoryTemplate.createMany({
      data: expensesSafe.map((i) => ({ companyId, name: i.name, description: i.description })),
    });

    // Proceso inicial del flujo del negocio.
    await tx.process.deleteMany({
      where: {
        companyId,
        description: GENERATED_PROCESS_DESCRIPTION,
      },
    });

    const process = await tx.process.create({
      data: {
        companyId,
        name: "Flujo del negocio",
        description: GENERATED_PROCESS_DESCRIPTION,
      },
      select: { id: true },
    });

    await tx.processStep.createMany({
      data: flowSafe.map((name, idx) => ({
        processId: process.id,
        name,
        ord: idx + 1,
      })),
    });

    // Diagnóstico inicial: problemas => Alertas, oportunidades => Recomendaciones
    await tx.recommendation.deleteMany({
      where: {
        companyId,
        sourceOnboardingSessionId: session.id,
      },
    });

    await tx.alert.deleteMany({
      where: {
        companyId,
        sourceOnboardingSessionId: session.id,
      },
    });

    const createdAlerts = await Promise.all(
      problemsDetailed.map((p) =>
        tx.alert.create({
          data: {
            companyId,
            snapshotId: null,
            type: "ONBOARDING_PROBLEM",
            severity: p.severity,
            status: "OPEN",
            title: p.title,
            message: p.message,
            sourceOnboardingSessionId: session.id,
          },
          select: { id: true },
        }),
      ),
    );

    await Promise.all(
      opportunitiesDetailed.map((o, idx) =>
        tx.recommendation.create({
          data: {
            companyId,
            alertId: createdAlerts[idx]?.id ?? null,
            title: o.title,
            rationale: o.rationale,
            expectedImpactCents: null,
            actionPlan: o.actionPlan,
            sourceOnboardingSessionId: session.id,
          },
        }),
      ),
    );
  });
}

