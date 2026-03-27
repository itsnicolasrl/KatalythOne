import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { embedText, getSimilarDocuments, runPrompt } from "@/src/services/ai/aiService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const querySchema = z.object({
  query: z.string().min(1),
  maxResults: z.coerce.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.read",
    });

    const body = querySchema.parse(await req.json());

    const queryEmbedding = await embedText(body.query);
    const knn = await getSimilarDocuments(company.id, queryEmbedding, body.maxResults ?? 5);

    const prompt = `Eres un asistente especialista en análisis y asistencia a empresarios.
Basado en los siguientes documentos, responde la consulta de forma breve y específica.

Consulta: ${body.query}

Documentos:
${knn.map((d, i) => `${i + 1}. Fuente: ${d.source}\n${d.content.slice(0, 500)}...\n`).join("\n")}

Respuesta:`;

    const answer = await runPrompt(prompt);

    return NextResponse.json({ query: body.query, answer, sources: knn });
  } catch (err) {
    return toErrorResponse(err);
  }
}
