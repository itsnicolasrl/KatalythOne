import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { saveAiDocument, listAiDocuments, embedText } from "@/src/services/ai/aiService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  source: z.string().min(1),
  content: z.string().min(1),
  generateEmbedding: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.read",
    });

    const documents = await listAiDocuments(company.id);
    return NextResponse.json({ documents });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.revenues.manage",
    });

    const body = createSchema.parse(await req.json());

    let embedding: number[] | undefined = undefined;
    if (body.generateEmbedding) {
      embedding = await embedText(body.content);
    }

    const document = await saveAiDocument({
      companyId: company.id,
      source: body.source,
      content: body.content,
      embedding,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
