import { createHash, randomBytes } from "crypto";
import { getPrisma } from "@/src/db/prisma";
import { env } from "@/src/lib/env";
import { signAccessToken } from "@/src/lib/auth/jwt";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";
import { HttpError } from "@/src/lib/errors/HttpError";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generateRefreshTokenValue(): string {
  // Opaque token (no JWT). Guardamos solo el hash en DB.
  return randomBytes(64).toString("base64url");
}

function computeExpiresAt(expiresIn: string): Date {
  const seconds = parseExpiresInToSeconds(expiresIn);
  if (!seconds) {
    // Fallback: 30 días si la variable no es parseable.
    const fallbackSeconds = 30 * 24 * 60 * 60;
    return new Date(Date.now() + fallbackSeconds * 1000);
  }
  return new Date(Date.now() + seconds * 1000);
}

export type RefreshRotationResult = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

export async function createRefreshTokensForUser(userId: string) {
  const prisma = getPrisma();

  const refreshToken = generateRefreshTokenValue();
  const tokenHash = sha256Hex(refreshToken);

  const refreshExpiresAt = computeExpiresAt(env.AUTH_REFRESH_EXPIRES_IN);

  const record = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: refreshExpiresAt,
    },
    select: {
      userId: true,
      tokenHash: true,
      expiresAt: true,
    },
  });

  const accessSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN) ?? 15 * 60;
  const accessExpiresAt = new Date(Date.now() + accessSeconds * 1000);

  return {
    userId: record.userId,
    accessToken: signAccessToken(record.userId),
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt: record.expiresAt,
  };
}

export async function rotateRefreshToken(params: {
  refreshTokenValue: string;
}): Promise<RefreshRotationResult> {
  const prisma = getPrisma();

  const tokenHash = sha256Hex(params.refreshTokenValue);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing) {
    throw new Error("Refresh token inválido");
  }

  if (existing.revokedAt) {
    throw new Error("Refresh token revocado");
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw new Error("Refresh token expirado");
  }

  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { accountDeletionScheduledFor: true },
  });
  if (user?.accountDeletionScheduledFor && user.accountDeletionScheduledFor.getTime() > Date.now()) {
    throw new HttpError(
      "Tu cuenta está pendiente de eliminación. Recupérala desde login.",
      403,
      "ACCOUNT_PENDING_DELETION",
    );
  }

  // Rotación: revocamos el token actual y creamos uno nuevo.
  const refreshTokenValueNew = generateRefreshTokenValue();
  const tokenHashNew = sha256Hex(refreshTokenValueNew);
  const refreshExpiresAt = computeExpiresAt(env.AUTH_REFRESH_EXPIRES_IN);

  const accessSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN) ?? 15 * 60;
  const accessExpiresAt = new Date(Date.now() + accessSeconds * 1000);
  const userId = existing.userId;

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: tokenHashNew,
      },
    });

    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: tokenHashNew,
        expiresAt: refreshExpiresAt,
      },
    });
  });

  return {
    userId,
    accessToken: signAccessToken(userId),
    refreshToken: refreshTokenValueNew,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

export async function revokeRefreshTokenByValue(params: {
  refreshTokenValue: string;
}): Promise<void> {
  const prisma = getPrisma();
  const tokenHash = sha256Hex(params.refreshTokenValue);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

