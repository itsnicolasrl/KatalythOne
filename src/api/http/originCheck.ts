import { HttpError } from "@/src/lib/errors/HttpError";
import { env } from "@/src/lib/env";

export function requireSameOrigin(req: Request) {
  // Para proteger contra CSRF en cookies: validamos Origin/Referer.
  // Si el request viene del navegador, normalmente trae Origin (fetch) o Referer.
  const allowed = new URL(env.APP_BASE_URL);

  const originHeader = req.headers.get("origin");
  if (originHeader) {
    const origin = new URL(originHeader);
    if (origin.host !== allowed.host) {
      throw new HttpError("CSRF detectado: origin inválido", 403, "CSRF_FORBIDDEN");
    }
    return;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    const refUrl = new URL(referer);
    if (refUrl.host !== allowed.host) {
      throw new HttpError("CSRF detectado: referer inválido", 403, "CSRF_FORBIDDEN");
    }
    return;
  }

  throw new HttpError("CSRF detectado: faltan headers de origen", 403, "CSRF_FORBIDDEN");
}

