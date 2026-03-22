export const env = {
  NODE_ENV: process.env.NODE_ENV,

  // Deben existir en runtime (login/migraciones/consultas). Se validan con helper.
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || undefined,

  AUTH_JWT_EXPIRES_IN: process.env.AUTH_JWT_EXPIRES_IN || "15m",
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || "katalyth_token",
  AUTH_REFRESH_COOKIE_NAME:
    process.env.AUTH_REFRESH_COOKIE_NAME || "katalyth_refresh_token",
  AUTH_REFRESH_EXPIRES_IN: process.env.AUTH_REFRESH_EXPIRES_IN || "30d",
  AUTH_COOKIE_SECURE:
    (process.env.AUTH_COOKIE_SECURE || "").toLowerCase() === "true",
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",

  ALERT_LOW_PROFIT_MARGIN_BPS_MAX: Number(
    process.env.ALERT_LOW_PROFIT_MARGIN_BPS_MAX || "500",
  ),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  STRIPE_PRICE_PRO_ID: process.env.STRIPE_PRICE_PRO_ID || undefined,
  STRIPE_PRICE_BUSINESS_ID: process.env.STRIPE_PRICE_BUSINESS_ID || undefined,
  STRIPE_SUCCESS_URL:
    process.env.STRIPE_SUCCESS_URL || `${process.env.APP_BASE_URL || "http://localhost:3000"}/pricing?success=1`,
  STRIPE_CANCEL_URL:
    process.env.STRIPE_CANCEL_URL || `${process.env.APP_BASE_URL || "http://localhost:3000"}/pricing?canceled=1`,
  BILLING_SIMULATED_MODE:
    (process.env.BILLING_SIMULATED_MODE || "").toLowerCase() === "true",
} as const;

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error(
      "Falta configuración: DATABASE_URL. Define un string de conexión PostgreSQL en tu .env",
    );
  }
  return env.DATABASE_URL;
}

export function requireAuthJwtSecret(): string {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error(
      "Falta configuración: AUTH_JWT_SECRET. Define un secreto para firmar JWT en tu .env",
    );
  }
  return env.AUTH_JWT_SECRET;
}

export function requireStripeSecretKey(): string {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Falta configuración: STRIPE_SECRET_KEY");
  }
  return env.STRIPE_SECRET_KEY;
}

export function requireStripeWebhookSecret(): string {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Falta configuración: STRIPE_WEBHOOK_SECRET");
  }
  return env.STRIPE_WEBHOOK_SECRET;
}

export function requireStripePriceProId(): string {
  if (!env.STRIPE_PRICE_PRO_ID) throw new Error("Falta configuración: STRIPE_PRICE_PRO_ID");
  return env.STRIPE_PRICE_PRO_ID;
}

export function requireStripePriceBusinessId(): string {
  if (!env.STRIPE_PRICE_BUSINESS_ID)
    throw new Error("Falta configuración: STRIPE_PRICE_BUSINESS_ID");
  return env.STRIPE_PRICE_BUSINESS_ID;
}


