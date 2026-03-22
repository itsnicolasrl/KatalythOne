export type CustomerKind = "PERSON" | "COMPANY";

/** Campos de perfil persistidos (sin agregados de lista como `value`). */
export type CustomerProfile = {
  id: string;
  kind: CustomerKind;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  legalName: string | null;
  taxId: string | null;
  industry: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  contactRole: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  createdAt?: string | Date;
};

export type CustomerForm = {
  kind: CustomerKind;
  name: string;
  email: string;
  phone: string;
  documentId: string;
  legalName: string;
  taxId: string;
  industry: string;
  secondaryEmail: string;
  secondaryPhone: string;
  contactRole: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  notes: string;
};

export function emptyCustomerForm(): CustomerForm {
  return {
    kind: "PERSON",
    name: "",
    email: "",
    phone: "",
    documentId: "",
    legalName: "",
    taxId: "",
    industry: "",
    secondaryEmail: "",
    secondaryPhone: "",
    contactRole: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    country: "",
    postalCode: "",
    notes: "",
  };
}

export function customerProfileToForm(c: CustomerProfile): CustomerForm {
  return {
    kind: c.kind ?? "PERSON",
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    documentId: c.documentId ?? "",
    legalName: c.legalName ?? "",
    taxId: c.taxId ?? "",
    industry: c.industry ?? "",
    secondaryEmail: c.secondaryEmail ?? "",
    secondaryPhone: c.secondaryPhone ?? "",
    contactRole: c.contactRole ?? "",
    website: c.website ?? "",
    addressLine1: c.addressLine1 ?? "",
    addressLine2: c.addressLine2 ?? "",
    city: c.city ?? "",
    region: c.region ?? "",
    country: c.country ?? "",
    postalCode: c.postalCode ?? "",
    notes: c.notes ?? "",
  };
}

export function customerFormToPayload(form: CustomerForm) {
  const t = (s: string) => {
    const x = s.trim();
    return x === "" ? null : x;
  };
  return {
    name: form.name.trim(),
    kind: form.kind,
    email: t(form.email),
    phone: t(form.phone),
    documentId: t(form.documentId),
    legalName: t(form.legalName),
    taxId: t(form.taxId),
    industry: t(form.industry),
    secondaryEmail: t(form.secondaryEmail),
    secondaryPhone: t(form.secondaryPhone),
    contactRole: t(form.contactRole),
    website: t(form.website),
    addressLine1: t(form.addressLine1),
    addressLine2: t(form.addressLine2),
    city: t(form.city),
    region: t(form.region),
    country: t(form.country),
    postalCode: t(form.postalCode),
    notes: t(form.notes),
  };
}
