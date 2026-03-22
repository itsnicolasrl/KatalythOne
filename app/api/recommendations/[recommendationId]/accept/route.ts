import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { getPrisma } from "@/src/db/prisma";
import { createProject } from "@/src/services/projects/projectsService";
import { createTask } from "@/src/services/tasks/tasksService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

function parseTasksFromActionPlan(actionPlan: string): string[] {
  const lines = actionPlan
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[).:-]?\s*/, "").replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return lines.slice(0, 8);

  return [
    "Definir KPI principal de la recomendación",
    "Ejecutar acción prioritaria de la semana",
    "Revisar resultado y ajustar plan",
  ];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function inferKpiTarget(params: { title: string; actionPlan: string }): string {
  const blob = `${params.title} ${params.actionPlan}`.toLowerCase();
  if (blob.includes("cliente") || blob.includes("dependenc")) {
    return "Reducir concentración del cliente principal por debajo de 50%";
  }
  if (blob.includes("margen") || blob.includes("rentabilidad") || blob.includes("cost")) {
    return "Mejorar margen neto semanal en tendencia positiva";
  }
  if (blob.includes("venta") || blob.includes("crecimiento")) {
    return "Incrementar conversión comercial y crecimiento semanal de ingresos";
  }
  return "Definir y mejorar KPI semanal asociado a la recomendación";
}

const bodySchema = z.object({
  projectName: z.string().min(3).max(140).optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ recommendationId: string }> },
) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.projects.manage",
    });
    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.tasks.manage",
    });

    const { recommendationId } = await context.params;
    const body = bodySchema.parse(await req.json().catch(() => ({})));
    const prisma = getPrisma();

    const recommendation = await prisma.recommendation.findFirst({
      where: { id: recommendationId, companyId: company.id },
      select: {
        id: true,
        title: true,
        actionPlan: true,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Recomendación no encontrada" }, { status: 404 });
    }

    const marker = `[AUTO_REC:${recommendation.id}]`;
    const existing = await prisma.project.findFirst({
      where: {
        companyId: company.id,
        description: { contains: marker },
      },
      select: { id: true, name: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: true, alreadyAccepted: true, project: existing },
        { status: 200 },
      );
    }

    const project = await createProject({
      companyId: company.id,
      name: body.projectName?.trim() || `Implementar: ${recommendation.title}`.slice(0, 120),
      description:
        `${marker}\nProyecto generado automáticamente desde una recomendación estratégica.\n` +
        "Hitos sugeridos: día 7, día 14, día 30.",
      createdByUserId: user.id,
      status: "ACTIVE",
    });

    const taskTitles = parseTasksFromActionPlan(recommendation.actionPlan);
    const kpiTarget = inferKpiTarget({
      title: recommendation.title,
      actionPlan: recommendation.actionPlan,
    });
    const now = new Date();
    const tasks = await Promise.all(
      taskTitles.map((title, idx) =>
        createTask({
          companyId: company.id,
          projectId: project.id,
          title: title.slice(0, 160),
          description: [
            idx === 0
              ? "Tarea prioritaria creada automáticamente al aceptar recomendación."
              : "Tarea generada automáticamente desde plan estratégico.",
            `KPI objetivo: ${kpiTarget}.`,
          ].join(" "),
          priority: idx === 0 ? "HIGH" : "MEDIUM",
          status: "TODO",
          dueAt:
            idx === 0
              ? addDays(now, 7)
              : idx === 1
                ? addDays(now, 14)
                : addDays(now, 30 + Math.max(0, idx - 2) * 7),
          createdByUserId: user.id,
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      alreadyAccepted: false,
      project,
      tasks,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
