import type { Prisma } from "@/src/generated/prisma";
import { getPrisma } from "@/src/db/prisma";
import { centsFromPrisma } from "@/src/lib/money/centsBigInt";
import { HttpError } from "@/src/lib/errors/HttpError";
import { createTtlCache, memoizeAsyncWithTtl } from "@/src/lib/ttlCache";

const customerListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  kind: true,
  documentId: true,
  legalName: true,
  taxId: true,
  industry: true,
  secondaryEmail: true,
  secondaryPhone: true,
  contactRole: true,
  website: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  region: true,
  country: true,
  postalCode: true,
  notes: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;

const customerWriteSelect = {
  ...customerListSelect,
  companyId: true,
} satisfies Prisma.CustomerSelect;

export type CreateCustomerInput = {
  companyId: string;
  name: string;
  kind?: "PERSON" | "COMPANY";
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  industry?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  contactRole?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
  notes?: string | null;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, "companyId" | "name">> & {
  name?: string;
};

function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

async function listCustomersUncached(companyId: string) {
  const prisma = getPrisma();
  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: customerListSelect,
  });

  if (customers.length === 0) return [];

  const customerIds = customers.map((c) => c.id);

  const byCurrency = await prisma.revenue.groupBy({
    by: ["customerId", "currency"],
    where: {
      companyId,
      customerId: { in: customerIds },
    },
    _sum: { amountCents: true },
    _count: { _all: true },
    _max: { occurredAt: true },
  });

  const lastPurchase = await prisma.revenue.groupBy({
    by: ["customerId"],
    where: { companyId, customerId: { in: customerIds } },
    _max: { occurredAt: true },
  });

  const totalsMap = new Map<string, { totalsByCurrency: Array<{ currency: string; totalCents: number }> }>();
  for (const row of byCurrency) {
    if (!row.customerId) continue;
    const existing = totalsMap.get(row.customerId) ?? { totalsByCurrency: [] };
    existing.totalsByCurrency.push({
      currency: row.currency,
      totalCents: centsFromPrisma(row._sum.amountCents),
    });
    totalsMap.set(row.customerId, existing);
  }

  const lastMap = new Map<string, Date | null>();
  for (const row of lastPurchase) {
    if (!row.customerId) continue;
    lastMap.set(row.customerId, row._max.occurredAt ?? null);
  }

  return customers.map((c) => ({
    ...c,
    value: totalsMap.get(c.id)?.totalsByCurrency ?? [],
    lastPurchaseAt: lastMap.get(c.id) ?? null,
  }));
}

const listCustomersCache = createTtlCache<
  Awaited<ReturnType<typeof listCustomersUncached>>
>({ ttlMs: 15_000 });
const listCustomersInFlight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof listCustomersUncached>>>
>();

export async function listCustomers(companyId: string) {
  const key = `listCustomers|${companyId}`;

  return memoizeAsyncWithTtl({
    key,
    ttlMs: 15_000,
    cache: listCustomersCache,
    inFlight: listCustomersInFlight,
    factory: async () => listCustomersUncached(companyId),
  });
}

export async function getCustomer(companyId: string, customerId: string) {
  const prisma = getPrisma();
  const customer = await prisma.customer.findFirst({
    where: { companyId, id: customerId },
    select: customerWriteSelect,
  });
  if (!customer) throw new HttpError("Cliente no encontrado", 404, "CUSTOMER_NOT_FOUND");
  return customer;
}

export async function createCustomer(input: CreateCustomerInput) {
  const prisma = getPrisma();
  if (input.name.trim().length < 2) {
    throw new HttpError("Nombre de cliente inválido", 400, "CUSTOMER_NAME_INVALID");
  }

  return prisma.customer.create({
    data: {
      companyId: input.companyId,
      name: input.name.trim(),
      kind: input.kind ?? "PERSON",
      email: trimOrNull(input.email ?? undefined),
      phone: trimOrNull(input.phone ?? undefined),
      documentId: trimOrNull(input.documentId ?? undefined),
      legalName: trimOrNull(input.legalName ?? undefined),
      taxId: trimOrNull(input.taxId ?? undefined),
      industry: trimOrNull(input.industry ?? undefined),
      secondaryEmail: trimOrNull(input.secondaryEmail ?? undefined),
      secondaryPhone: trimOrNull(input.secondaryPhone ?? undefined),
      contactRole: trimOrNull(input.contactRole ?? undefined),
      website: trimOrNull(input.website ?? undefined),
      addressLine1: trimOrNull(input.addressLine1 ?? undefined),
      addressLine2: trimOrNull(input.addressLine2 ?? undefined),
      city: trimOrNull(input.city ?? undefined),
      region: trimOrNull(input.region ?? undefined),
      country: trimOrNull(input.country ?? undefined),
      postalCode: trimOrNull(input.postalCode ?? undefined),
      notes: trimOrNull(input.notes ?? undefined),
    },
    select: customerWriteSelect,
  });
}

export async function updateCustomer(params: {
  companyId: string;
  customerId: string;
  input: UpdateCustomerInput;
}) {
  const prisma = getPrisma();
  const data: Prisma.CustomerUpdateInput = {};

  if (params.input.name !== undefined) {
    const n = params.input.name.trim();
    if (n.length < 2) throw new HttpError("Nombre de cliente inválido", 400, "CUSTOMER_NAME_INVALID");
    data.name = n;
  }
  if (params.input.kind !== undefined) data.kind = params.input.kind;
  if (params.input.email !== undefined) data.email = trimOrNull(params.input.email);
  if (params.input.phone !== undefined) data.phone = trimOrNull(params.input.phone);
  if (params.input.documentId !== undefined) data.documentId = trimOrNull(params.input.documentId);
  if (params.input.legalName !== undefined) data.legalName = trimOrNull(params.input.legalName);
  if (params.input.taxId !== undefined) data.taxId = trimOrNull(params.input.taxId);
  if (params.input.industry !== undefined) data.industry = trimOrNull(params.input.industry);
  if (params.input.secondaryEmail !== undefined)
    data.secondaryEmail = trimOrNull(params.input.secondaryEmail);
  if (params.input.secondaryPhone !== undefined)
    data.secondaryPhone = trimOrNull(params.input.secondaryPhone);
  if (params.input.contactRole !== undefined) data.contactRole = trimOrNull(params.input.contactRole);
  if (params.input.website !== undefined) data.website = trimOrNull(params.input.website);
  if (params.input.addressLine1 !== undefined) data.addressLine1 = trimOrNull(params.input.addressLine1);
  if (params.input.addressLine2 !== undefined) data.addressLine2 = trimOrNull(params.input.addressLine2);
  if (params.input.city !== undefined) data.city = trimOrNull(params.input.city);
  if (params.input.region !== undefined) data.region = trimOrNull(params.input.region);
  if (params.input.country !== undefined) data.country = trimOrNull(params.input.country);
  if (params.input.postalCode !== undefined) data.postalCode = trimOrNull(params.input.postalCode);
  if (params.input.notes !== undefined) data.notes = trimOrNull(params.input.notes);

  const count = await prisma.customer.updateMany({
    where: { companyId: params.companyId, id: params.customerId },
    data,
  });
  if (count.count === 0) {
    throw new HttpError("Cliente no encontrado", 404, "CUSTOMER_NOT_FOUND");
  }

  return prisma.customer.findFirst({
    where: { companyId: params.companyId, id: params.customerId },
    select: customerWriteSelect,
  });
}

export async function deleteCustomer(params: { companyId: string; customerId: string }) {
  const prisma = getPrisma();
  const count = await prisma.customer.deleteMany({
    where: { companyId: params.companyId, id: params.customerId },
  });
  if (count.count === 0) throw new HttpError("Cliente no encontrado", 404, "CUSTOMER_NOT_FOUND");
  return { ok: true };
}
