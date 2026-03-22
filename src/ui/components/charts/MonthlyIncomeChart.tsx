import * as React from "react";

export type MonthlyIncomePoint = {
  bucket: string; // YYYY-MM (UTC)
  revenueCents: number;
};

function buildPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function computeBounds(values: number[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

export function MonthlyIncomeChart({
  points,
  width = 760,
  height = 220,
}: {
  points: MonthlyIncomePoint[];
  width?: number;
  height?: number;
}) {
  const w = width;
  const h = height;
  const pad = 24;

  const revenueValues = points.map((p) => p.revenueCents);
  const { min, max } = computeBounds(revenueValues);

  const denom = max - min;
  const y = (v: number) => {
    if (denom === 0) return pad + (h - pad * 2) / 2;
    const t = (v - min) / denom;
    return pad + (h - pad * 2) * (1 - t);
  };

  const x = (i: number) => {
    if (points.length <= 1) return pad;
    const t = i / (points.length - 1);
    return pad + (w - pad * 2) * t;
  };

  const poly = buildPolyline(
    points.map((p, i) => ({
      x: x(i),
      y: y(p.revenueCents),
    })),
  );

  const labelEvery = points.length > 10 ? Math.ceil(points.length / 6) : 1;
  const last = points[points.length - 1];

  return (
    <div className="rounded-2xl border border-foreground/10 bg-background p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-extrabold">Ingresos mensuales</p>
          <p className="text-sm text-foreground/70 mt-1">Moneda según empresa</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold">
            Último: {last ? `${(last.revenueCents / 100).toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
        <polyline points={poly} fill="none" stroke="#F28705" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const show = i % labelEvery === 0 || i === points.length - 1;
          if (!show) return null;
          // p.bucket: YYYY-MM => mostramos MM
          return (
            <text
              key={p.bucket}
              x={x(i)}
              y={h - 8}
              fontSize="10"
              fill="rgba(0,0,0,0.55)"
              textAnchor="middle"
            >
              {p.bucket.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

