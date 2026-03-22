import { z } from "zod";

/** Convierte "" / undefined en undefined y trim; null explícito se conserva vía preprocess en emails. */
function optionalNullableTrimmed(max: number) {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    },
    z.union([z.string().max(max), z.null()]).optional(),
  );
}

function optionalNullableEmail() {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    },
    z.union([z.string().email().max(200), z.null()]).optional(),
  );
}

function optionalNullablePhone() {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    },
    z.union([z.string().min(3).max(40), z.null()]).optional(),
  );
}

export const createCustomerBodySchema = z.object({
  name: z.string().min(2).max(120),
  kind: z.enum(["PERSON", "COMPANY"]).optional(),

  email: optionalNullableEmail(),
  phone: optionalNullablePhone(),
  secondaryEmail: optionalNullableEmail(),
  secondaryPhone: optionalNullablePhone(),

  documentId: optionalNullableTrimmed(80),
  legalName: optionalNullableTrimmed(200),
  taxId: optionalNullableTrimmed(80),
  industry: optionalNullableTrimmed(120),
  contactRole: optionalNullableTrimmed(120),

  website: optionalNullableTrimmed(500),

  addressLine1: optionalNullableTrimmed(200),
  addressLine2: optionalNullableTrimmed(200),
  city: optionalNullableTrimmed(120),
  region: optionalNullableTrimmed(120),
  country: optionalNullableTrimmed(120),
  postalCode: optionalNullableTrimmed(32),

  notes: optionalNullableTrimmed(16_000),
});

export const updateCustomerBodySchema = createCustomerBodySchema.partial();

export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerBodySchema>;
