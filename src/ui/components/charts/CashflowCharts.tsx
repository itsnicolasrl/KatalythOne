import * as React from "react";

type CashflowSeriesPoint = {
  bucket: string;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  marginBps: number | null;
};

function buildPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function buildArea(points: Array<{ x: number; y: number }>, baseline: number) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return [
    `${first.x.toFixed(2)},${baseline.toFixed(2)}`,
    ...points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`),
    `${last.x.toFixed(2)},${baseline.toFixed(2)}`,
  ].join(" ");
}

function computeBounds(values: number[]) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function formatBucket(bucket: string) {
  // "2024-03-15" → "15/03"
  const parts = bucket.slice(0, 10).split("-");
  if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
  return bucket.slice(5);
}

// ── Shared layout constants ──────────────────────────────
const W = 760;
const H = 200;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

function xOf(i: number, total: number) {
  if (total <= 1) return PAD_LEFT;
  return PAD_LEFT + ((W - PAD_LEFT - PAD_RIGHT) * i) / (total - 1);
}

function yOf(v: number, min: number, max: number) {
  const denom = max - min;
  const t = denom === 0 ? 0.5 : (v - min) / denom;
  return PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - t);
}

// ── NetCashflowChart ─────────────────────────────────────
export function NetCashflowChart({
  points,
}: {
  points: CashflowSeriesPoint[];
}) {
  if (points.length === 0) {
    return <ChartEmpty label="Flujo neto" />;
  }

  const netValues = points.map((p) => p.netCents);
  const { min, max } = computeBounds(netValues);

  const coords = points.map((p, i) => ({
    x: xOf(i, points.length),
    y: yOf(p.netCents, min, max),
    value: p.netCents,
    bucket: p.bucket,
  }));

  const baseline = yOf(0, min, max);
  const poly = buildPolyline(coords);
  const area = buildArea(coords, baseline);

  const last = points[points.length - 1];
  const isPositive = (last?.netCents ?? 0) >= 0;
  const lineColor = isPositive ? "#16a34a" : "#dc2626";
  const areaColor = isPositive ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)";

  const labelEvery = points.length > 14 ? Math.ceil(points.length / 7) : 2;

  return (
    <ChartWrapper
      title="Flujo neto"
      subtitle="Ingresos − Gastos · Serie diaria"
      badge={
        last
          ? {
              label: `${(last.netCents / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`,
              positive: isPositive,
            }
          : null
      }
    >
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        {/* Zero line */}
        {Number.isFinite(baseline) && (
          <line
            x1={PAD_LEFT} x2={W - PAD_RIGHT}
            y1={baseline} y2={baseline}
            stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* Area fill */}
        <polygon points={area} fill={areaColor} />

        {/* Line */}
        <polyline
          points={poly}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dot en último punto */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3.5"
            fill={lineColor}
          />
        )}

        {/* Etiquetas eje X */}
        {coords.map((c, i) => {
          const show = i % labelEvery === 0 || i === coords.length - 1;
          if (!show) return null;
          return (
            <text
              key={c.bucket}
              x={c.x} y={H - 6}
              fontSize="9" fill="rgba(0,0,0,0.35)"
              textAnchor="middle"
            >
              {formatBucket(c.bucket)}
            </text>
          );
        })}
      </svg>
    </ChartWrapper>
  );
}

// ── MarginChart ──────────────────────────────────────────
export function MarginChart({
  points,
}: {
  points: CashflowSeriesPoint[];
}) {
  const validPoints = points
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.marginBps !== null && Number.isFinite(p.marginBps));

  if (validPoints.length === 0) {
    return <ChartEmpty label="Margen" />;
  }

  const margins = validPoints.map((p) => p.marginBps as number);
  const { min, max } = computeBounds(margins);

  const coords = validPoints.map((p) => ({
    x: xOf(p.i, points.length),
    y: yOf(p.marginBps as number, min, max),
    value: p.marginBps as number,
    bucket: p.bucket,
  }));

  const baseline = yOf(0, min, max);
  const poly = buildPolyline(coords);
  const area = buildArea(coords, Math.min(baseline, H - PAD_BOTTOM));

  const lastMargin = validPoints[validPoints.length - 1]?.marginBps ?? null;
  const isPositive = (lastMargin ?? 0) >= 0;
  const labelEvery = points.length > 14 ? Math.ceil(points.length / 7) : 2;

  return (
    <ChartWrapper
      title="Margen"
      subtitle="Profit / ingresos · Sin dato si ingresos = 0"
      badge={
        lastMargin !== null
          ? { label: `${(lastMargin / 100).toFixed(2)}%`, positive: isPositive }
          : null
      }
    >
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        {/* Zero line */}
        {Number.isFinite(baseline) && baseline >= PAD_TOP && baseline <= H - PAD_BOTTOM && (
          <line
            x1={PAD_LEFT} x2={W - PAD_RIGHT}
            y1={baseline} y2={baseline}
            stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* Area */}
        <polygon points={area} fill="rgba(242,135,5,0.08)" />

        {/* Line */}
        <polyline
          points={poly}
          fill="none"
          stroke="#F28705"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dot en último punto */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3.5"
            fill="#F28705"
          />
        )}

        {/* Etiquetas eje X */}
        {coords.map((c, i) => {
          const show = i % labelEvery === 0 || i === coords.length - 1;
          if (!show) return null;
          return (
            <text
              key={c.bucket}
              x={c.x} y={H - 6}
              fontSize="9" fill="rgba(0,0,0,0.35)"
              textAnchor="middle"
            >
              {formatBucket(c.bucket)}
            </text>
          );
        })}
      </svg>
    </ChartWrapper>
  );
}

// ── Shared sub-components ────────────────────────────────
function ChartWrapper({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: { label: string; positive: boolean } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-black text-black">{title}</p>
          <p className="text-[10px] text-black/40 mt-0.5">{subtitle}</p>
        </div>
        {badge && (
          <div className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black flex-shrink-0",
            badge.positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600",
          ].join(" ")}>
            <span>{badge.positive ? "↑" : "↓"}</span>
            <span>{badge.label}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
      <p className="text-sm font-black text-black mb-0.5">{label}</p>
      <p className="text-[10px] text-black/40 mb-6">Sin datos suficientes para graficar</p>
      <div className="h-[120px] rounded-xl bg-[#F5F4F2] flex items-center justify-center">
        <p className="text-xs text-black/30">Sin datos</p>
      </div>
    </div>
  );
}