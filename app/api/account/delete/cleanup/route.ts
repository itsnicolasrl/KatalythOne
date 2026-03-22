import { NextResponse } from "next/server";
import { getPrisma } from "@/src/db/prisma";

export async function POST(req: Request) {
  const cronSecret = process.env.ACCOUNT_DELETION_CRON_SECRET;
  const incoming = req.headers.get("x-cron-secret");

  if (!cronSecret || !incoming || incoming !== cronSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const prisma = getPrisma();
  const now = new Date();
  const result = await prisma.user.deleteMany({
    where: {
      accountDeletionScheduledFor: {
        lte: now,
      },
    },
  });

  return NextResponse.json({ ok: true, deletedUsers: result.count, executedAt: now.toISOString() });
}
