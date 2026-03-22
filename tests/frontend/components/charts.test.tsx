/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MarginChart, NetCashflowChart } from "@/src/ui/components/charts/CashflowCharts";

describe("Charts", () => {
  it("renderiza NetCashflowChart con puntos", () => {
    const points = [
      { bucket: "2026-01-01", revenueCents: 100, expenseCents: 50, netCents: 50, marginBps: 5000 },
      { bucket: "2026-01-02", revenueCents: 200, expenseCents: 120, netCents: 80, marginBps: null },
      { bucket: "2026-01-03", revenueCents: 150, expenseCents: 140, netCents: 10, marginBps: 2000 },
    ];

    const { container } = render(<NetCashflowChart points={points} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("no falla con puntos vacíos", () => {
    const { container } = render(<NetCashflowChart points={[]} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renderiza MarginChart", () => {
    const points = [
      { bucket: "2026-01-01", revenueCents: 100, expenseCents: 50, netCents: 50, marginBps: 5000 },
      { bucket: "2026-01-02", revenueCents: 200, expenseCents: 120, netCents: 80, marginBps: null },
    ];
    const { container } = render(<MarginChart points={points} />);
    expect(container.querySelector("polyline")).toBeTruthy();
  });
});

