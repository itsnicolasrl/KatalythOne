import { HttpError } from "@/src/lib/errors/HttpError";

/** Centavos enteros → BigInt para columnas monetarias en Prisma/PostgreSQL. */
export function centsToBigInt(cents: number): bigint {
  if (!Number.isFinite(cents)) throw new HttpError("Monto inválido", 400, "MONEY_INVALID");
  if (!Number.isInteger(cents)) throw new HttpError("Monto inválido", 400, "MONEY_INVALID");
  return BigInt(cents);
}

export function nullableCentsToBigInt(cents: number | null | undefined): bigint | null {
  if (cents === undefined || cents === null) return null;
  return centsToBigInt(cents);
}

/** Lee centavos desde Prisma (BigInt) o agregaciones; expone number para JSON/UI (hasta MAX_SAFE_INTEGER). */
export function centsFromPrisma(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "bigint" ? Number(v) : v;
}

/** Suma Prisma `_sum.amountCents` u otro agregado nullable. */
export function prismaSumToBigInt(v: bigint | number | null | undefined): bigint {
  if (v == null) return BigInt(0);
  return typeof v === "bigint" ? v : BigInt(v);
}

/** MetricSnapshot y similares: normaliza BIGINT → number para lógica y JSON. */
export function mapSnapshotCentsFields<
  T extends { revenueCents: bigint | number; expenseCents: bigint | number; profitCents: bigint | number },
>(s: T) {
  return {
    ...s,
    revenueCents: centsFromPrisma(s.revenueCents),
    expenseCents: centsFromPrisma(s.expenseCents),
    profitCents: centsFromPrisma(s.profitCents),
  };
}
