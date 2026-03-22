import { NextResponse } from "next/server";
import { requireUser } from "@/src/api/auth/requireUser";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ user });
}

