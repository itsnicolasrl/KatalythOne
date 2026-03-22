import { sign, verify } from "jsonwebtoken";
import { env, requireAuthJwtSecret } from "@/src/lib/env";

export type AccessTokenPayload = {
  sub: string;
};

export function signAccessToken(userId: string): string {
  const expiresIn = env.AUTH_JWT_EXPIRES_IN as Parameters<typeof sign>[2] extends
    | { expiresIn?: infer E }
    | undefined
    ? E
    : never;

  return sign(
    { sub: userId } satisfies AccessTokenPayload,
    requireAuthJwtSecret(),
    { expiresIn },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = verify(token, requireAuthJwtSecret());
  // jsonwebtoken tipa como string | JwtPayload.
  if (typeof decoded === "string") throw new Error("Token inválido");
  if (!decoded.sub || typeof decoded.sub !== "string") {
    throw new Error("Token sin sub válido");
  }
  return { sub: decoded.sub };
}

