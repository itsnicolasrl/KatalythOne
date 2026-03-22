export function parseExpiresInToSeconds(expiresIn: string): number | null {
  // jsonwebtoken soporta "10s", "5m", "1h", "7d" o número de segundos como string.
  const n = Number(expiresIn);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);

  const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return value * multiplier;
}

