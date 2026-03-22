import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { sanitizeText } from "@/src/lib/sanitize";

export type SupplierCreateInput = {
  companyId: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTermsDays?: number | null;
};

export async function listSuppliers(params: { companyId: string }) {
  const prisma = getPrisma();
  return prisma.supplier.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      paymentTermsDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createSupplier(input: SupplierCreateInput) {
  const prisma = getPrisma();
  const name = input.name.trim();
  if (name.length < 2) throw new HttpError("Nombre del proveedor inválido", 400, "SUPPLIER_NAME_INVALID");

  const paymentTermsDays =
    input.paymentTermsDays === null || input.paymentTermsDays === undefined
      ? null
      : Math.max(0, Math.round(input.paymentTermsDays));

  const row = await prisma.supplier.create({
    data: {
      companyId: input.companyId,
      name: sanitizeText(name, { maxLen: 200 }),
      contactName: input.contactName ? sanitizeText(input.contactName, { maxLen: 200 }) : null,
      email: input.email ? sanitizeText(input.email, { maxLen: 200 }) : null,
      phone: input.phone ? sanitizeText(input.phone, { maxLen: 60 }) : null,
      paymentTermsDays,
    },
    select: {
      id: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      paymentTermsDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return row;
}

