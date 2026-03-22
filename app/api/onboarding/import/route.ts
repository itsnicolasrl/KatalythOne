import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser } from "@/src/api/auth/requireUser";
import { getPrisma } from "@/src/db/prisma";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";

type GenericRow = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\$/g, "").replace(/,/g, "").trim();
    const n = Number(normalized);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function getString(row: GenericRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function inferType(row: GenericRow): "REVENUE" | "EXPENSE" | null {
  const typeRaw = getString(row, ["type", "tipo", "movement", "movimiento"]).toLowerCase();
  if (typeRaw.includes("revenue") || typeRaw.includes("ingreso") || typeRaw.includes("venta")) return "REVENUE";
  if (typeRaw.includes("expense") || typeRaw.includes("gasto") || typeRaw.includes("cost")) return "EXPENSE";

  const amount = toNumber(row.amount ?? row.monto ?? row.total ?? row.valor);
  if (amount == null) return null;
  if (amount < 0) return "EXPENSE";
  return "REVENUE";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();
    const formData = await req.formData();
    const file = formData.get("file");
    const companyIdFromBody = formData.get("companyId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }

    const activeCompany = await getActiveCompanyForRequest();
    const companyId =
      typeof companyIdFromBody === "string" && companyIdFromBody
        ? companyIdFromBody
        : activeCompany?.id;

    if (!companyId) {
      return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    }

    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { companyId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso a esa empresa" }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const rows: GenericRow[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetRows = XLSX.utils.sheet_to_json<GenericRow>(sheet, { defval: null });
      rows.push(...sheetRows);
    }

    if (!rows.length) {
      return NextResponse.json({ error: "El archivo no contiene filas" }, { status: 400 });
    }

    let importedCustomers = 0;
    let importedRevenues = 0;
    let importedExpenses = 0;
    const customerCache = new Map<string, string>();

    for (const row of rows) {
      const customerName = getString(row, ["customer", "cliente", "client", "customer_name"]);
      let customerId: string | null = null;

      if (customerName) {
        const key = customerName.toLowerCase();
        const cached = customerCache.get(key);
        if (cached) {
          customerId = cached;
        } else {
          const existing = await prisma.customer.findFirst({
            where: { companyId, name: customerName },
            select: { id: true },
          });
          if (existing) {
            customerId = existing.id;
          } else {
            const created = await prisma.customer.create({
              data: {
                companyId,
                name: customerName,
                email: getString(row, ["email", "correo", "customer_email"]) || null,
                phone: getString(row, ["phone", "telefono", "customer_phone"]) || null,
              },
              select: { id: true },
            });
            customerId = created.id;
            importedCustomers += 1;
          }
          customerCache.set(key, customerId);
        }
      }

      const type = inferType(row);
      const amountRaw = toNumber(row.amount ?? row.monto ?? row.total ?? row.valor);
      if (!type || amountRaw == null) continue;

      const amountCents = Math.round(Math.abs(amountRaw) * 100);
      if (amountCents <= 0) continue;
      const occurredAt = toDate(row.date ?? row.fecha ?? row.occurredAt);
      const currency = getString(row, ["currency", "moneda"]) || "USD";
      const description =
        getString(row, ["description", "descripcion", "concept", "concepto"]) || null;

      if (type === "REVENUE") {
        await prisma.revenue.create({
          data: {
            companyId,
            customerId,
            occurredAt,
            amountCents: BigInt(amountCents),
            currency,
            description,
          },
        });
        importedRevenues += 1;
      } else {
        await prisma.expense.create({
          data: {
            companyId,
            occurredAt,
            amountCents: BigInt(amountCents),
            currency,
            description,
          },
        });
        importedExpenses += 1;
      }
    }

    const diagnosisHints: string[] = [];
    if (importedRevenues === 0) diagnosisHints.push("No se detectaron ingresos importables.");
    if (importedExpenses === 0) diagnosisHints.push("No se detectaron gastos importables.");
    if (importedRevenues > 0 && importedExpenses > 0) {
      diagnosisHints.push("Ya hay base financiera para calcular riesgo y margen inicial.");
    }
    if (importedCustomers > 0) {
      diagnosisHints.push("Se creó base de clientes para análisis de dependencia y recurrencia.");
    }

    return NextResponse.json({
      ok: true,
      summary: {
        importedRows: rows.length,
        importedCustomers,
        importedRevenues,
        importedExpenses,
      },
      diagnosisHints,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
