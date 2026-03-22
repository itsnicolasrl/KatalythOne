-- Centavos monetarios: INTEGER (32 bits) se queda corto (~2.1e9). Pasamos a BIGINT.

ALTER TABLE "Revenue" ALTER COLUMN "amountCents" TYPE BIGINT USING "amountCents"::bigint;
ALTER TABLE "Revenue" ALTER COLUMN "unitPriceCents" TYPE BIGINT USING "unitPriceCents"::bigint;

ALTER TABLE "Expense" ALTER COLUMN "amountCents" TYPE BIGINT USING "amountCents"::bigint;

ALTER TABLE "MetricSnapshot" ALTER COLUMN "revenueCents" TYPE BIGINT USING "revenueCents"::bigint;
ALTER TABLE "MetricSnapshot" ALTER COLUMN "expenseCents" TYPE BIGINT USING "expenseCents"::bigint;
ALTER TABLE "MetricSnapshot" ALTER COLUMN "profitCents" TYPE BIGINT USING "profitCents"::bigint;

ALTER TABLE "Recommendation" ALTER COLUMN "expectedImpactCents" TYPE BIGINT USING "expectedImpactCents"::bigint;
