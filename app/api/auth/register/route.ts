import { NextResponse } from "next/server";
import { z } from "zod";
import { register } from "@/src/services/auth/authService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = bodySchema.parse(body);

    await register(input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

