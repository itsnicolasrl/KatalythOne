import { NextResponse } from "next/server";
import { requireUser } from "@/src/api/auth/requireUser";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const TEMPLATE_HEADERS = [
  "date",
  "type",
  "amount",
  "currency",
  "customer",
  "email",
  "phone",
  "description",
];

const TEMPLATE_NOTES = [
  "Notas de uso:",
  "- date: fecha (ej: 2026-03-20).",
  "- type: REVENUE o EXPENSE.",
  "- amount: numero positivo (ej: 1250.50).",
  "- currency: USD, EUR, COP, etc.",
  "- customer: nombre del cliente (opcional en gastos).",
  "- email/phone: opcionales.",
  "- description: detalle del movimiento.",
];

export async function GET() {
  try {
    await requireUser();

    const csv = `${TEMPLATE_HEADERS.join(",")}\n\n${TEMPLATE_NOTES.map((n) => `"${n.replace(/"/g, '""')}"`).join("\n")}\n`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="katalyth-import-template.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
