import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";

type Dimension = "MARKET" | "OPERATIONS" | "FINANCIAL" | "CUSTOMERS";
type Priority = "ALTA" | "MEDIA" | "BAJA";

type EvidenceSignal = {
  dimension: Dimension;
  metric: string;
  value: number;
  weight: number;
  note: string;
};

export type StrategicDiagnosisItem = {
  diagnostico: string;
  causa: string;
  impacto: string;
  recomendacion: string;
  prioridad: Priority;
};

export type StrategicOnboardingAnalysis = {
  companyId: string;
  generatedAt: Date;
  profile: {
    companyType: string;
    maturityLevel: string;
    businessStage: string;
    customerType: string;
    topClientConcentration: string;
    whatCompanyDoes: string;
    targetCustomer: string;
    offers: string[];
    businessFlowSteps: string[];
    incomeStreams: string[];
    expenseCategories: string[];
  };
  marketStudy: {
    inferredSector: string;
    competitionLevel: "BAJO" | "MEDIO" | "ALTO";
    demandTrend: "DECRECIENTE" | "ESTABLE" | "CRECIENTE";
    positioningSuggestions: string[];
  };
  scores: {
    structural: number;
    operations: number;
    financial: number;
    market: number;
    global: number;
    riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  };
  findings: StrategicDiagnosisItem[];
  signals: EvidenceSignal[];
  riskTimeline: Array<{
    weekLabel: string;
    periodEnd: string;
    riskScore: number;
    riskLevel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  }>;
  actionableRecommendations: Array<{
    recommendationId: string;
    title: string;
    actionPlan: string;
    priority: Priority;
    educational: {
      whyItAffects: string;
      howToMeasure: string;
    };
    execution: {
      accepted: boolean;
      projectId: string | null;
      projectName: string | null;
      totalTasks: number;
      completedTasks: number;
      progressPercent: number;
    };
  }>;
};

function clamp0_100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function getJsonString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getJsonStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function inferMarketStudy(params: {
  whatCompanyDoes: string;
  offers: string[];
  targetCustomer: string;
}): StrategicOnboardingAnalysis["marketStudy"] {
  const corpus = `${params.whatCompanyDoes} ${params.targetCustomer} ${params.offers.join(" ")}`
    .toLowerCase()
    .trim();

  const sectorKeywords: Array<{ sector: string; words: string[] }> = [
    { sector: "Servicios profesionales", words: ["consultor", "asesor", "agencia", "servicio"] },
    { sector: "Tecnología / software", words: ["software", "saas", "app", "plataforma", "automat"] },
    { sector: "Comercio / retail", words: ["tienda", "producto", "ecommerce", "venta", "comercio"] },
    { sector: "Educación / formación", words: ["curso", "academ", "capacit", "mentor", "formación"] },
    { sector: "Marketing / contenido", words: ["marketing", "contenido", "redes", "marca", "publicidad"] },
  ];

  let inferredSector = "Microempresa de servicios";
  let bestScore = -1;
  for (const row of sectorKeywords) {
    const score = row.words.reduce((acc, word) => acc + (corpus.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      inferredSector = row.sector;
    }
  }

  const competitionHighWords = ["agencia", "marketing", "diseño", "consultor", "freelance", "ecommerce"];
  const competitionMediumWords = ["software", "automat", "formación", "curso"];
  const highHits = competitionHighWords.filter((w) => corpus.includes(w)).length;
  const mediumHits = competitionMediumWords.filter((w) => corpus.includes(w)).length;
  const competitionLevel =
    highHits >= 2 ? "ALTO" : highHits === 1 || mediumHits >= 1 ? "MEDIO" : "BAJO";

  const trendGrowthWords = ["automat", "digital", "ia", "online", "suscrip", "remoto"];
  const trendDeclineWords = ["solo presencial", "sin digital", "local único"];
  const growthHits = trendGrowthWords.filter((w) => corpus.includes(w)).length;
  const declineHits = trendDeclineWords.filter((w) => corpus.includes(w)).length;
  const demandTrend = growthHits >= 2 ? "CRECIENTE" : declineHits > 0 ? "DECRECIENTE" : "ESTABLE";

  const positioningSuggestions = [
    "Define un nicho específico y evita una propuesta demasiado genérica.",
    "Convierte tu diferenciador en una oferta visible (pack/plan/servicio principal).",
    "Documenta 2-3 casos de resultado para reforzar credibilidad comercial.",
  ];

  if (competitionLevel === "ALTO") {
    positioningSuggestions.unshift("Especializa la propuesta por segmento para reducir guerra de precios.");
  }

  return { inferredSector, competitionLevel, demandTrend, positioningSuggestions };
}

function buildSignals(params: {
  maturityLevel: string;
  topClientConcentration: string;
  businessFlowStepsCount: number;
  goalsCount: number;
  monthlyIncomeRange: string;
  monthlyExpenseRange: string;
  openHighAlerts: number;
  latestMarginBps: number | null;
}): EvidenceSignal[] {
  const signals: EvidenceSignal[] = [];

  const maturityMap: Record<string, number> = { LOW: 30, MEDIUM: 65, HIGH: 85 };
  signals.push({
    dimension: "OPERATIONS",
    metric: "Madurez operativa",
    value: maturityMap[params.maturityLevel] ?? 50,
    weight: 0.22,
    note: `Nivel reportado: ${params.maturityLevel || "NO_DEFINIDO"}`,
  });

  const concentrationMap: Record<string, number> = { "<20": 90, "20-50": 70, "50-70": 40, ">70": 20 };
  signals.push({
    dimension: "CUSTOMERS",
    metric: "Diversificación de clientes",
    value: concentrationMap[params.topClientConcentration] ?? 55,
    weight: 0.2,
    note: `Concentración principal: ${params.topClientConcentration || "NO_DEFINIDA"}`,
  });

  signals.push({
    dimension: "OPERATIONS",
    metric: "Definición de flujo de trabajo",
    value: clamp0_100(params.businessFlowStepsCount * 18),
    weight: 0.14,
    note: `Pasos modelados: ${params.businessFlowStepsCount}`,
  });

  signals.push({
    dimension: "MARKET",
    metric: "Claridad estratégica (objetivos)",
    value: clamp0_100(params.goalsCount * 25),
    weight: 0.1,
    note: `Objetivos definidos: ${params.goalsCount}`,
  });

  const rangeToScore = (income: string, expense: string) => {
    const rank = (v: string) => {
      if (v === "<1000") return 1;
      if (v === "1000-5000") return 2;
      if (v === "5001-20000") return 3;
      if (v === ">20000") return 4;
      return 2;
    };
    const diff = rank(income) - rank(expense);
    if (diff >= 2) return 90;
    if (diff === 1) return 75;
    if (diff === 0) return 55;
    if (diff === -1) return 35;
    return 20;
  };

  signals.push({
    dimension: "FINANCIAL",
    metric: "Balance ingreso/gasto declarado",
    value: rangeToScore(params.monthlyIncomeRange, params.monthlyExpenseRange),
    weight: 0.2,
    note: `Ingresos ${params.monthlyIncomeRange || "?"} vs gastos ${params.monthlyExpenseRange || "?"}`,
  });

  const marginScore = params.latestMarginBps == null ? 55 : clamp0_100((params.latestMarginBps / 3000) * 100);
  signals.push({
    dimension: "FINANCIAL",
    metric: "Margen reciente observado",
    value: marginScore,
    weight: 0.09,
    note: params.latestMarginBps == null ? "Sin snapshot reciente" : `Margen bps: ${params.latestMarginBps}`,
  });

  const alertPressure = clamp0_100(100 - params.openHighAlerts * 25);
  signals.push({
    dimension: "FINANCIAL",
    metric: "Presión de alertas críticas",
    value: alertPressure,
    weight: 0.05,
    note: `Alertas altas/críticas abiertas: ${params.openHighAlerts}`,
  });

  return signals;
}

function scoreByDimension(signals: EvidenceSignal[], dimension: Dimension): number {
  const scoped = signals.filter((s) => s.dimension === dimension);
  if (!scoped.length) return 0;
  const totalWeight = scoped.reduce((acc, s) => acc + s.weight, 0);
  const weighted = scoped.reduce((acc, s) => acc + s.value * s.weight, 0);
  return clamp0_100(weighted / totalWeight);
}

function buildFindings(params: {
  scores: StrategicOnboardingAnalysis["scores"];
  marketStudy: StrategicOnboardingAnalysis["marketStudy"];
  topClientConcentration: string;
  maturityLevel: string;
}): StrategicDiagnosisItem[] {
  const findings: StrategicDiagnosisItem[] = [];

  if (params.topClientConcentration === ">70" || params.topClientConcentration === "50-70") {
    findings.push({
      diagnostico: "Dependencia comercial elevada",
      causa: "Una parte significativa de los ingresos depende de un solo cliente.",
      impacto: "Riesgo alto de caja y estabilidad si ese cliente reduce o retrasa pagos.",
      recomendacion: "Diseñar un plan de diversificación en 8 semanas con metas semanales de captación.",
      prioridad: params.topClientConcentration === ">70" ? "ALTA" : "MEDIA",
    });
  }

  if (params.maturityLevel === "LOW") {
    findings.push({
      diagnostico: "Estructura operativa frágil",
      causa: "Procesos y métricas todavía informales para operar con consistencia.",
      impacto: "Baja productividad y dificultad para crecer sin aumentar caos operativo.",
      recomendacion: "Formalizar flujo operativo (SOP ligero) y medir tiempos por etapa del servicio.",
      prioridad: "ALTA",
    });
  }

  if (params.marketStudy.competitionLevel === "ALTO") {
    findings.push({
      diagnostico: "Mercado de alta presión competitiva",
      causa: "Propuesta en una categoría con muchos oferentes similares.",
      impacto: "Mayor sensibilidad a precio y menor tasa de cierre si no hay diferenciación clara.",
      recomendacion: "Posicionar una oferta específica por nicho y comunicar resultados medibles.",
      prioridad: "MEDIA",
    });
  }

  if (params.scores.financial <= 40) {
    findings.push({
      diagnostico: "Riesgo financiero de corto plazo",
      causa: "Relación ingreso/gasto y señales de alerta reducen el margen de maniobra.",
      impacto: "Posible déficit operativo en próximas semanas si no se corrige.",
      recomendacion: "Activar plan de estabilización: recorte selectivo de costos y mejora de cobranza.",
      prioridad: "ALTA",
    });
  }

  if (findings.length === 0) {
    findings.push({
      diagnostico: "Base operativa con potencial de escalamiento",
      causa: "Se observan señales de estructura y control suficientes para iterar con datos.",
      impacto: "Menor riesgo de improvisación y mejor capacidad de ejecutar decisiones estratégicas.",
      recomendacion: "Mantener revisión semanal de KPIs y experimentar mejoras de forma controlada.",
      prioridad: "BAJA",
    });
  }

  return findings;
}

function toRiskLevel(global: number): StrategicOnboardingAnalysis["scores"]["riskLevel"] {
  if (global <= 30) return "CRITICO";
  if (global <= 50) return "ALTO";
  if (global <= 70) return "MEDIO";
  return "BAJO";
}

function inferEducationalExplanation(params: {
  alertType: string | null;
  title: string;
  rationale: string;
}): { whyItAffects: string; howToMeasure: string } {
  const blob = `${params.alertType ?? ""} ${params.title} ${params.rationale}`.toLowerCase();
  if (blob.includes("dependen") || blob.includes("cliente")) {
    return {
      whyItAffects:
        "La dependencia de pocos clientes reduce estabilidad: si uno cae, impacta de forma desproporcionada tus ingresos.",
      howToMeasure:
        "Mide semanalmente el % de ingresos del top 1 y top 3 clientes. Objetivo: bajar concentración por debajo de 40-50%.",
    };
  }
  if (blob.includes("rentabilidad") || blob.includes("margen") || blob.includes("cost")) {
    return {
      whyItAffects:
        "Cuando el margen es bajo, cada venta deja menos caja libre para operar y crecer.",
      howToMeasure:
        "Mide margen bruto/neto por semana y % de gastos fijos sobre ingresos. Objetivo: tendencia ascendente sostenida del margen.",
    };
  }
  if (blob.includes("venta") || blob.includes("crecimiento")) {
    return {
      whyItAffects:
        "La caída comercial prolongada reduce flujo de caja y limita capacidad de financiar operación.",
      howToMeasure:
        "Mide pipeline semanal, tasa de conversión y ticket promedio. Objetivo: recuperar tendencia positiva por 4 semanas.",
    };
  }
  return {
    whyItAffects:
      "Este punto impacta la ejecución operativa y la predictibilidad financiera del negocio.",
    howToMeasure:
      "Define un KPI semanal específico para esta recomendación y revisa su evolución cada 7 días.",
  };
}

function buildTimelineFromSnapshots(
  snapshots: Array<{ periodEnd: Date; profitMarginBps: number | null; revenueCents: number; expenseCents: number }>,
) {
  return snapshots
    .slice()
    .reverse()
    .map((s) => {
      const marginScore =
        s.profitMarginBps == null ? 50 : clamp0_100((s.profitMarginBps / 3000) * 100);
      const cashScore = s.revenueCents > s.expenseCents ? 75 : 30;
      const riskScore = clamp0_100(marginScore * 0.7 + cashScore * 0.3);
      return {
        weekLabel: new Intl.DateTimeFormat("es-ES", { month: "short", day: "2-digit" }).format(
          s.periodEnd,
        ),
        periodEnd: s.periodEnd.toISOString(),
        riskScore,
        riskLevel: toRiskLevel(riskScore),
      };
    });
}

export async function getStrategicOnboardingAnalysis(companyId: string): Promise<StrategicOnboardingAnalysis | null> {
  const prisma = getPrisma();

  const [profile, latestSnapshot, openHighAlerts, recentSnapshots, recentRecommendations, autoProjects] = await Promise.all([
    prisma.companyOnboardingProfile.findUnique({
      where: { companyId },
      select: {
        companyType: true,
        whatCompanyDoes: true,
        offers: true,
        targetCustomer: true,
        businessFlowSteps: true,
        incomeStreams: true,
        expenseCategories: true,
        businessModel: true,
      },
    }),
    prisma.metricSnapshot.findFirst({
      where: { companyId },
      orderBy: { periodEnd: "desc" },
      select: { profitMarginBps: true },
    }),
    prisma.alert.count({
      where: {
        companyId,
        status: "OPEN",
        severity: { in: ["HIGH", "CRITICAL"] },
      },
    }),
    prisma.metricSnapshot.findMany({
      where: { companyId },
      orderBy: { periodEnd: "desc" },
      take: 12,
      select: {
        periodEnd: true,
        profitMarginBps: true,
        revenueCents: true,
        expenseCents: true,
      },
    }),
    prisma.recommendation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        actionPlan: true,
        rationale: true,
        alert: {
          select: {
            type: true,
            severity: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: {
        companyId,
        description: { contains: "[AUTO_REC:" },
      },
      select: {
        id: true,
        name: true,
        description: true,
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
  ]);

  if (!profile) return null;

  const offersArray = Array.isArray(profile.offers) ? profile.offers : [];
  const flowStepsArray = Array.isArray(profile.businessFlowSteps) ? profile.businessFlowSteps : [];
  const incomeStreamsArray = Array.isArray(profile.incomeStreams) ? profile.incomeStreams : [];
  const expenseCategoriesArray = Array.isArray(profile.expenseCategories) ? profile.expenseCategories : [];
  const offersNames = (offersArray as Array<{ name?: string }>)
    .map((x) => (typeof x.name === "string" ? x.name : ""))
    .filter(Boolean);

  const businessModel =
    typeof profile.businessModel === "object" && profile.businessModel && !Array.isArray(profile.businessModel)
      ? (profile.businessModel as Record<string, unknown>)
      : {};

  const marketStudy = inferMarketStudy({
    whatCompanyDoes: profile.whatCompanyDoes,
    offers: (offersArray as Array<{ name?: string }>)
      .map((x) => (typeof x.name === "string" ? x.name : ""))
      .filter(Boolean),
    targetCustomer: profile.targetCustomer,
  });

  const maturityLevel = getJsonString(businessModel, "maturityLevel");
  const businessStage = getJsonString(businessModel, "businessStage");
  const customerType = getJsonString(businessModel, "customerType");
  const topClientConcentration = getJsonString(businessModel, "topClientConcentration");
  const monthlyIncomeRange = getJsonString(businessModel, "monthlyIncomeRange");
  const monthlyExpenseRange = getJsonString(businessModel, "monthlyExpenseRange");
  const goals = getJsonStringArray(businessModel, "goals");
  const incomeStreams = (incomeStreamsArray as Array<{ name?: string }>)
    .map((x) => (typeof x.name === "string" ? x.name : ""))
    .filter(Boolean);
  const expenseCategories = (expenseCategoriesArray as Array<{ name?: string }>)
    .map((x) => (typeof x.name === "string" ? x.name : ""))
    .filter(Boolean);

  const signals = buildSignals({
    maturityLevel,
    topClientConcentration,
    businessFlowStepsCount: flowStepsArray.length,
    goalsCount: goals.length,
    monthlyIncomeRange,
    monthlyExpenseRange,
    openHighAlerts,
    latestMarginBps: latestSnapshot?.profitMarginBps ?? null,
  });

  const structural = clamp0_100((scoreByDimension(signals, "OPERATIONS") + scoreByDimension(signals, "CUSTOMERS")) / 2);
  const operations = scoreByDimension(signals, "OPERATIONS");
  const financial = scoreByDimension(signals, "FINANCIAL");
  const market = scoreByDimension(signals, "MARKET");
  const global = clamp0_100(structural * 0.3 + operations * 0.2 + financial * 0.35 + market * 0.15);
  const riskLevel = toRiskLevel(global);

  const scores: StrategicOnboardingAnalysis["scores"] = {
    structural,
    operations,
    financial,
    market,
    global,
    riskLevel,
  };

  const findings = buildFindings({
    scores,
    marketStudy,
    topClientConcentration,
    maturityLevel,
  });

  const riskTimeline = buildTimelineFromSnapshots(
    recentSnapshots.map((s) => ({
      periodEnd: s.periodEnd,
      profitMarginBps: s.profitMarginBps,
      revenueCents: centsFromPrisma(s.revenueCents),
      expenseCents: centsFromPrisma(s.expenseCents),
    })),
  );
  const projectByRecommendationId = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      totalTasks: number;
      completedTasks: number;
      progressPercent: number;
    }
  >();

  for (const project of autoProjects) {
    const description = project.description ?? "";
    const match = description.match(/\[AUTO_REC:([a-z0-9]+)\]/i);
    if (!match?.[1]) continue;
    const recommendationId = match[1];
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const progressPercent =
      totalTasks === 0 ? 0 : clamp0_100((completedTasks / totalTasks) * 100);
    projectByRecommendationId.set(recommendationId, {
      projectId: project.id,
      projectName: project.name,
      totalTasks,
      completedTasks,
      progressPercent,
    });
  }

  const actionableRecommendations = recentRecommendations.map((r) => {
    const priority: Priority =
      r.alert?.severity === "CRITICAL" || r.alert?.severity === "HIGH"
        ? "ALTA"
        : r.alert?.severity === "MEDIUM"
          ? "MEDIA"
          : "BAJA";
    const execution = projectByRecommendationId.get(r.id);
    return {
      recommendationId: r.id,
      title: r.title,
      actionPlan: r.actionPlan,
      priority,
      educational: inferEducationalExplanation({
        alertType: r.alert?.type ?? null,
        title: r.title,
        rationale: r.rationale,
      }),
      execution: {
        accepted: Boolean(execution),
        projectId: execution?.projectId ?? null,
        projectName: execution?.projectName ?? null,
        totalTasks: execution?.totalTasks ?? 0,
        completedTasks: execution?.completedTasks ?? 0,
        progressPercent: execution?.progressPercent ?? 0,
      },
    };
  });

  return {
    companyId,
    generatedAt: new Date(),
    profile: {
      companyType: profile.companyType,
      maturityLevel: maturityLevel || "NO_DEFINIDO",
      businessStage: businessStage || "NO_DEFINIDO",
      customerType: customerType || "NO_DEFINIDO",
      topClientConcentration: topClientConcentration || "NO_DEFINIDO",
      whatCompanyDoes: profile.whatCompanyDoes,
      targetCustomer: profile.targetCustomer,
      offers: offersNames,
      businessFlowSteps: flowStepsArray
        .map((x) => {
          if (typeof x === "string") return x;
          if (x && typeof x === "object" && "name" in x && typeof (x as { name?: unknown }).name === "string") {
            return (x as { name: string }).name;
          }
          return "";
        })
        .filter(Boolean),
      incomeStreams,
      expenseCategories,
    },
    marketStudy,
    scores,
    findings,
    signals,
    riskTimeline,
    actionableRecommendations,
  };
}
