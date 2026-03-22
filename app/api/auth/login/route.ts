import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/src/lib/env";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";
import { login } from "@/src/services/auth/authService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { createRefreshTokensForUser } from "@/src/services/auth/refreshTokenService";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = bodySchema.parse(body);

    const { userId } = await login(input);
    const tokens = await createRefreshTokensForUser(userId);

    const accessMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN);
    const refreshMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_REFRESH_EXPIRES_IN);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(env.AUTH_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure: env.AUTH_COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAgeSeconds ?? undefined,
    });

    res.cookies.set(env.AUTH_REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: env.AUTH_COOKIE_SECURE,
      sameSite: "strict",
      path: "/",
      maxAge: refreshMaxAgeSeconds ?? undefined,
    });

    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}

