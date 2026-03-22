import { describe, expect, it, vi } from "vitest";

describe("buildRecommendationForAlertType", () => {
  it("calcula expectedImpactCents para FINANCIAL_RISK con impacto positivo", async () => {
    vi.stubEnv("ALERT_LOW_PROFIT_MARGIN_BPS_MAX", "500");
    vi.resetModules();

    const { buildRecommendationForAlertType } = await import(
      "@/src/services/diagnostics/recommendationsBuilder"
    );

    const ctx = {
      companyId: "company-1",
      latest: {
        id: "snap-1",
        currency: "EUR",
        periodStart: new Date("2026-01-01T00:00:00.000Z"),
        periodEnd: new Date("2026-01-31T00:00:00.000Z"),
        revenueCents: 10_000,
        expenseCents: 9_700,
        profitCents: 300,
        profitMarginBps: 300,
      },
      previousSnapshot: null,
      expenseRatio: 0.97,
      hasRevenue: true,
      profitMarginBps: 300,
      marginLow: false,
      growthBps: null,
      hasPrevRevenue: false,
      customerDependence: {
        activeCustomersCount: 10,
        totalCustomerRevenueCents: 10_000,
        top1Share: 0.1,
        top3Share: 0.2,
        hhi: 0.12,
      },
    };

    const rec = buildRecommendationForAlertType({
      alertType: "FINANCIAL_RISK",
      ctx,
    });

    // targetMarginBps = 500 + 100 = 600
    // targetProfitCents = (600 * 10_000) / 10_000 = 600
    // impact = 600 - 300 = 300
    expect(rec.expectedImpactCents).toBe(300);
  });

  it("calcula expectedImpactCents para SALES_FALL usando previousSnapshot", async () => {
    vi.stubEnv("ALERT_LOW_PROFIT_MARGIN_BPS_MAX", "500");
    vi.resetModules();

    const { buildRecommendationForAlertType } = await import(
      "@/src/services/diagnostics/recommendationsBuilder"
    );

    const ctx = {
      companyId: "company-1",
      latest: {
        id: "snap-2",
        currency: "EUR",
        periodStart: new Date("2026-02-01T00:00:00.000Z"),
        periodEnd: new Date("2026-02-28T00:00:00.000Z"),
        revenueCents: 10_000,
        expenseCents: 7_500,
        profitCents: 2_500,
        profitMarginBps: 2_500,
      },
      previousSnapshot: { id: "snap-1", revenueCents: 12_000 },
      expenseRatio: 0.75,
      hasRevenue: true,
      profitMarginBps: 2_500,
      marginLow: false,
      growthBps: -1_000,
      hasPrevRevenue: true,
      customerDependence: {
        activeCustomersCount: 6,
        totalCustomerRevenueCents: 12_000,
        top1Share: 0.5,
        top3Share: 0.8,
        hhi: 0.4,
      },
    };

    const rec = buildRecommendationForAlertType({
      alertType: "SALES_FALL",
      ctx,
    });

    // previous - latest = 12_000 - 10_000 = 2_000
    expect(rec.expectedImpactCents).toBe(2000);
  });
});

