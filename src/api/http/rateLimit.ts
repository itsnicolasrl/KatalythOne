import { HttpError } from "@/src/lib/errors/HttpError";

type Bucket = {
  count: number;
  resetAt: number;
};

type Store = {
  buckets: Map<string, Bucket>;
};

const globalKey = "__katalyh_rate_limit_store__";

function getStore(): Store {
  const g = globalThis as unknown as { [key: string]: Store | undefined };
  if (!g[globalKey]) {
    g[globalKey] = { buckets: new Map<string, Bucket>() };
  }
  return g[globalKey]!;
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip");
  return ip ?? "unknown";
}

/** Síncrona: si fuera `async` sin `await` en las rutas, los throws no entrarían en el try/catch. */
export function enforceRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
}) {
  const store = getStore();
  const now = Date.now();
  const existing = store.buckets.get(params.key);

  if (!existing || now >= existing.resetAt) {
    store.buckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return;
  }

  if (existing.count >= params.max) {
    throw new HttpError("Demasiadas solicitudes. Intenta más tarde.", 429, "RATE_LIMITED");
  }

  store.buckets.set(params.key, { ...existing, count: existing.count + 1 });
}

