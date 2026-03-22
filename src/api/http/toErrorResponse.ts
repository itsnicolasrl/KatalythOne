import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/src/generated/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";

function isConfigErrorMessage(message: string) {
  return (
    message.includes("DATABASE_URL") ||
    message.includes("AUTH_JWT_SECRET") ||
    message.includes("STRIPE_") ||
    message.includes("Falta configuración")
  );
}

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.message, code: err.code ?? "HTTP_ERROR" },
      { status: err.statusCode },
    );
  }

  if (err instanceof ZodError) {
    const flat = err.flatten();
    const fieldMsgs = Object.values(flat.fieldErrors).flat().filter(Boolean) as string[];
    const first = fieldMsgs[0] ?? flat.formErrors[0] ?? "Datos inválidos";
    return NextResponse.json(
      {
        error: first,
        code: "VALIDATION_ERROR",
        details: process.env.NODE_ENV === "development" ? flat : undefined,
      },
      { status: 400 },
    );
  }

  if (err instanceof SyntaxError && err.message.toLowerCase().includes("json")) {
    return NextResponse.json(
      { error: "Cuerpo JSON inválido", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un registro con esos datos", code: "UNIQUE_VIOLATION" },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json(
        { error: "Registro no encontrado", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (err.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Falta una tabla en la base de datos. Ejecuta las migraciones: npx prisma migrate deploy",
          code: "TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    if (err.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "La base de datos no coincide con el esquema (falta una columna). Ejecuta: npx prisma migrate deploy",
          code: "COLUMN_MISSING",
        },
        { status: 503 },
      );
    }
    if (err.code === "P2020") {
      return NextResponse.json(
        {
          error:
            "Valor numérico fuera de rango para la base de datos. Si es un monto muy grande, actualiza migraciones; si no, revisa que el importe sea correcto.",
          code: "VALUE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "No se pudo completar la operación en base de datos",
        code: `PRISMA_${err.code}`,
      },
      { status: 400 },
    );
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: "Consulta de datos inválida", code: "PRISMA_VALIDATION" },
      { status: 400 },
    );
  }

  if (err instanceof Error && isConfigErrorMessage(err.message)) {
    return NextResponse.json(
      { error: err.message, code: "CONFIG_ERROR" },
      { status: 503 },
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[API] Error no manejado:", err);
  }

  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    {
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development" ? { debug: message } : {}),
    },
    { status: 500 },
  );
}
