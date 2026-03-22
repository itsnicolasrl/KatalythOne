import crypto from "crypto";
import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { env } from "@/src/lib/env";

export type CreateInviteInput = {
  companyId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdByUserId?: string;
  expiresInDays?: number;
};

export type CompanyInviteRole = "OWNER" | "ADMIN" | "MEMBER";

export type CompanyInviteDTO = {
  id: string;
  companyId: string;
  email: string;
  role: CompanyInviteRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  acceptedByUserId: string | null;
};

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createCompanyInvite(input: CreateInviteInput): Promise<{
  invite: CompanyInviteDTO;
  token: string;
  inviteUrl: string;
}> {
  const prisma = getPrisma();

  const email = normalizeEmail(input.email);
  const expiresInDays = input.expiresInDays ?? 7;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const inviterId = input.createdByUserId;
  const inviterMembership =
    inviterId ? await prisma.companyUser.findUnique({ where: { userId_companyId: { userId: inviterId, companyId: input.companyId } }, select: { role: true } }) : null;

  if (inviterMembership && input.role === "OWNER" && inviterMembership.role !== "OWNER") {
    throw new HttpError("Solo OWNER puede invitar con rol OWNER", 403, "INVITE_OWNER_FORBIDDEN");
  }

  // Si ya existe membresía para ese usuario, igual permitimos invitación (el accept será idempotente),
  // pero evitamos duplicar invites activos para la misma compañía+email.
  const existingActive = await prisma.companyInvite.findFirst({
    where: {
      companyId: input.companyId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (existingActive) {
    throw new HttpError("Ya existe una invitación activa para ese email", 409, "INVITE_ACTIVE_EXISTS");
  }

  const invite = await prisma.companyInvite.create({
    data: {
      companyId: input.companyId,
      email,
      role: input.role,
      tokenHash,
      createdByUserId: input.createdByUserId ?? null,
      expiresAt,
    },
    select: {
      id: true,
      companyId: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      acceptedByUserId: true,
    },
  });

  return {
    invite: {
      ...invite,
      acceptedAt: invite.acceptedAt ?? null,
      revokedAt: invite.revokedAt ?? null,
      acceptedByUserId: invite.acceptedByUserId ?? null,
    },
    token: rawToken,
    inviteUrl: `${env.APP_BASE_URL}/invites/accept?token=${encodeURIComponent(rawToken)}`,
  };
}

export async function listCompanyInvites(params: {
  companyId: string;
  take?: number;
}): Promise<CompanyInviteDTO[]> {
  const prisma = getPrisma();
  const invites = await prisma.companyInvite.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 20,
    select: {
      id: true,
      companyId: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      acceptedByUserId: true,
    },
  });

  return invites.map((i) => ({
    ...i,
    acceptedAt: i.acceptedAt ?? null,
    revokedAt: i.revokedAt ?? null,
    acceptedByUserId: i.acceptedByUserId ?? null,
  }));
}

export async function revokeCompanyInvite(params: { companyId: string; inviteId: string }) {
  const prisma = getPrisma();
  const existing = await prisma.companyInvite.findFirst({
    where: { id: params.inviteId, companyId: params.companyId },
    select: { id: true, revokedAt: true, acceptedAt: true },
  });
  if (!existing) throw new HttpError("Invitación no encontrada", 404, "INVITE_NOT_FOUND");
  if (existing.acceptedAt) throw new HttpError("No se puede revocar una invitación aceptada", 400, "INVITE_ACCEPTED");
  if (existing.revokedAt) return { ok: true };

  await prisma.companyInvite.update({
    where: { id: params.inviteId },
    data: { revokedAt: new Date() },
    select: { id: true },
  });
  return { ok: true };
}

export async function acceptCompanyInvite(params: {
  companyId?: string;
  rawToken: string;
  userId: string;
  userEmail: string;
}): Promise<{ membershipCreated: boolean; role: CompanyInviteRole }> {
  const prisma = getPrisma();
  const userEmail = normalizeEmail(params.userEmail);

  const tokenHash = hashToken(params.rawToken);

  const invite = await prisma.companyInvite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      ...(params.companyId ? { companyId: params.companyId } : {}),
      email: userEmail,
    },
    select: {
      id: true,
      companyId: true,
      role: true,
      acceptedAt: true,
    },
  });

  if (!invite) throw new HttpError("Invitación inválida o vencida", 400, "INVITE_INVALID");

  const existingMembership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId: params.userId, companyId: invite.companyId } },
    select: { role: true },
  });

  if (!existingMembership) {
    await prisma.companyUser.create({
      data: {
        companyId: invite.companyId,
        userId: params.userId,
        role: invite.role,
      },
    });
  } else if (existingMembership.role !== invite.role) {
    // Ajustamos el rol si ya era miembro.
    await prisma.companyUser.update({
      where: { userId_companyId: { userId: params.userId, companyId: invite.companyId } },
      data: { role: invite.role },
    });
  }

  await prisma.companyInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
      acceptedByUserId: params.userId,
    },
  });

  return { membershipCreated: !existingMembership, role: invite.role };
}

