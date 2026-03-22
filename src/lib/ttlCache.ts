type Entry<T> = {
  value: T;
  expiresAt: number;
};

export function createTtlCache<T>({ ttlMs }: { ttlMs: number }) {
  const store = new Map<string, Entry<T>>();

  function get(key: string): T | undefined {
    const existing = store.get(key);
    if (!existing) return undefined;
    if (Date.now() > existing.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return existing.value;
  }

  function set(key: string, value: T) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  return { get, set };
}

export async function memoizeAsyncWithTtl<T>(params: {
  key: string;
  ttlMs: number;
  cache: ReturnType<typeof createTtlCache<T>>;
  inFlight: Map<string, Promise<T>>;
  factory: () => Promise<T>;
}) {
  const cached = params.cache.get(params.key);
  if (cached !== undefined) return cached;

  const existing = params.inFlight.get(params.key);
  if (existing) return existing;

  const promise = (async () => {
    const value = await params.factory();
    params.cache.set(params.key, value);
    return value;
  })();

  params.inFlight.set(params.key, promise);
  try {
    return await promise;
  } finally {
    params.inFlight.delete(params.key);
  }
}

