import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { HttpError } from "@/src/lib/errors/HttpError";

export type ProjectFinancialCurrencyRow = {
  currency: string;
  actualRevenueCents: number;
  actualExpenseCents: number;
  actualProfitCents: number;
};

export type ProjectSummaryMember = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
};

export type ProjectSummary = {
  project: {
    id: string;
    name: string;
    status: string;
    budgetCurrency: string | null;
    estimatedCostCents: number | null;
    estimatedRevenueCents: number | null;
  };
  members: ProjectSummaryMember[];
  totals: {
    timeMinutes: number;
    financialByCurrency: ProjectFinancialCurrencyRow[];
  };
  timeEntries: Array<{
    id: string;
    userId: string;
    minutes: number;
    occurredAt: Date;
    description: string | null;
    createdAt: Date;
    userEmail: string;
    userFullName: string | null;
  }>;
};

export async function getProjectSummary(params: { companyId: string; projectId: string }) {
  const prisma = getPrisma();

  const project = await prisma.project.findFirst({
    where: { companyId: params.companyId, id: params.projectId },
    select: {
      id: true,
      name: true,
      status: true,
      budgetCurrency: true,
      estimatedCostCents: true,
      estimatedRevenueCents: true,
    },
  });

  if (!project) throw new HttpError("Proyecto no encontrado", 404, "PROJECT_NOT_FOUND");

  const [members, timeAgg, timeEntries, expenseByCurrency, revenueByCurrency] = await Promise.all([
    prisma.companyUser.findMany({
      where: { companyId: params.companyId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectTimeEntry.aggregate({
      where: { companyId: params.companyId, projectId: params.projectId },
      _sum: { minutes: true },
    }),
    prisma.projectTimeEntry.findMany({
      where: { companyId: params.companyId, projectId: params.projectId },
      orderBy: { occurredAt: "desc" },
      take: 30,
      select: {
        id: true,
        userId: true,
        minutes: true,
        occurredAt: true,
        description: true,
        createdAt: true,
        user: { select: { email: true, fullName: true } },
      },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where: { companyId: params.companyId, projectId: params.projectId },
      _sum: { amountCents: true },
    }),
    prisma.revenue.groupBy({
      by: ["currency"],
      where: { companyId: params.companyId, projectId: params.projectId },
      _sum: { amountCents: true },
    }),
  ]);

  const expenseMap = new Map<string, number>();
  for (const r of expenseByCurrency) {
    expenseMap.set(r.currency, centsFromPrisma(r._sum.amountCents));
  }
  const revenueMap = new Map<string, number>();
  for (const r of revenueByCurrency) {
    revenueMap.set(r.currency, centsFromPrisma(r._sum.amountCents));
  }

  const currencies = new Set<string>([...expenseMap.keys(), ...revenueMap.keys()]);
  const financialByCurrency: ProjectFinancialCurrencyRow[] = [];
  for (const currency of currencies) {
    const actualRevenueCents = revenueMap.get(currency) ?? 0;
    const actualExpenseCents = expenseMap.get(currency) ?? 0;
    financialByCurrency.push({
      currency,
      actualRevenueCents,
      actualExpenseCents,
      actualProfitCents: actualRevenueCents - actualExpenseCents,
    });
  }
  financialByCurrency.sort((a, b) => a.currency.localeCompare(b.currency));

  const totals = {
    timeMinutes: timeAgg._sum.minutes ?? 0,
    financialByCurrency,
  };

  const membersMapped: ProjectSummaryMember[] = members.map((m) => ({
    userId: m.userId,
    email: m.user.email,
    fullName: m.user.fullName,
    role: m.role,
  }));

  const projectMapped = {
    id: project.id,
    name: project.name,
    status: project.status,
    budgetCurrency: project.budgetCurrency ?? null,
    estimatedCostCents: project.estimatedCostCents == null ? null : centsFromPrisma(project.estimatedCostCents),
    estimatedRevenueCents: project.estimatedRevenueCents == null ? null : centsFromPrisma(project.estimatedRevenueCents),
  };

  return {
    project: projectMapped,
    members: membersMapped,
    totals,
    timeEntries: timeEntries.map((t) => ({
      id: t.id,
      userId: t.userId,
      minutes: t.minutes,
      occurredAt: t.occurredAt,
      description: t.description,
      createdAt: t.createdAt,
      userEmail: t.user.email,
      userFullName: t.user.fullName,
    })),
  } satisfies ProjectSummary;
}

