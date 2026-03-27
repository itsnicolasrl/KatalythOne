import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

const LOCAL_AI_URL = process.env.LOCAL_AI_URL ?? "http://localhost:8000";

export type AiSearchResult = {
  id: string;
  source: string;
  content: string;
  score: number;
};

export async function saveAiDocument(params: {
  companyId: string;
  source: string;
  content: string;
  embedding?: number[];
}) {
  const prisma = getPrisma();
  return prisma.aiDocument.create({
    data: {
      companyId: params.companyId,
      source: params.source,
      content: params.content,
      embedding: params.embedding ? params.embedding : undefined,
    },
  });
}

export async function listAiDocuments(companyId: string) {
  const prisma = getPrisma();
  return prisma.aiDocument.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

function cosineDistance(v1: number[], v2: number[]) {
  const dot = v1.reduce((sum, v, i) => sum + v * (v2[i] ?? 0), 0);
  const mag1 = Math.sqrt(v1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(v2.reduce((sum, v) => sum + v * v, 0));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
}

export async function getSimilarDocuments(companyId: string, queryEmbedding: number[], take = 8): Promise<AiSearchResult[]> {
  const prisma = getPrisma();
  const rows = await prisma.aiDocument.findMany({ where: { companyId } });
  const withEmbedding = rows.filter((r) => Array.isArray(r.embedding));
  const withScore = withEmbedding
    .map((r) => {
      const emb = Array.isArray(r.embedding) ? (r.embedding as number[]) : [];
      return {
        id: r.id,
        source: r.source,
        content: r.content,
        score: cosineDistance(queryEmbedding, emb),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
  return withScore;
}

export async function embedText(text: string): Promise<number[]> {
  const resp = await fetch(`${LOCAL_AI_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) throw new HttpError("No se pudo calcular embedding", 500, "AI_EMBED_ERROR");
  const data = (await resp.json()) as { embedding: number[] };
  return data.embedding;
}

export async function runPrompt(prompt: string): Promise<string> {
  const resp = await fetch(`${LOCAL_AI_URL}/completion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) throw new HttpError("No se pudo ejecutar el modelo LLM", 500, "AI_MODEL_ERROR");
  const data = (await resp.json()) as { text: string };
  return data.text;
}
