import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    { error: "Webhook de Stripe deshabilitado: facturacion ahora es interna por tarjeta." },
    { status: 410 },
  );
}

