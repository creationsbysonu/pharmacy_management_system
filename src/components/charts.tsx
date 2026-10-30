import { cn } from "@/lib/utils";

/** Stable, collision-free ids for SVG gradients without client hooks. */
function svgId(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

export interface Point {
  label: string;
  value: number;
}

/** Compact axis labels: ₹1.2L rather than ₹120,000.00. */
function compactAxis(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 10_000) return `${sign}₹${Math.round(abs / 1_000)}k`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / magnitude;
  const step = scaled <= 1.2 ? 1.2 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Small inline trend line, used inside KPI cards. */
export function Sparkline({
  values,
  className,
  positive = true,
}: {
  values: number[];
  className?: string;
  positive?: boolean;
}) {
  if (values.length === 0) return null;

  const width = 120;
  const height = 36;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-9 w-28 overflow-visible", className)}
      role="img"
      aria-label={`Trend across ${values.length} points`}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={positive ? "var(--chart-1)" : "var(--chart-5)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={Number(points[points.length - 1].split(",")[0])}
        cy={Number(points[points.length - 1].split(",")[1])}
        r="2.6"
        fill={positive ? "var(--chart-1)" : "var(--chart-5)"}
      />
    </svg>
  );
}

/**
 * Revenue / volume trend. Renders as plain SVG so it ships no client JavaScript.
 */
export function AreaChart({
  points,
  formatValue = (value: number) => String(Math.round(value)),
  axisFormat = compactAxis,
  className,
  height = 232,
  ariaLabel = "Trend chart",
}: {
  points: Point[];
  formatValue?: (value: number) => string;
  axisFormat?: (value: number) => string;
  className?: string;
  height?: number;
  ariaLabel?: string;
}) {
  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing recorded in this period yet.
      </p>
    );
  }

  const width = 760;
  const padX = 14;
  const padLeft = 46;
  const padTop = 18;
  const padBottom = 30;
  const plotHeight = height - padTop - padBottom;
  const max = niceMax(Math.max(...points.map((point) => point.value)));
  const step = points.length > 1 ? (width - padX - padLeft) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: padLeft + index * step,
    y: padTop + plotHeight - (point.value / max) * plotHeight,
    ...point,
  }));

  // Smooth the line with quadratic midpoints: no overshoot, no dependencies.
  let line = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 1; i < coords.length; i += 1) {
    const previous = coords[i - 1];
    const current = coords[i];
    const midX = (previous.x + current.x) / 2;
    line += ` Q ${midX.toFixed(2)} ${previous.y.toFixed(2)} ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }

  const area = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${(
    padTop + plotHeight
  ).toFixed(2)} L ${coords[0].x.toFixed(2)} ${(padTop + plotHeight).toFixed(2)} Z`;

  const gradient = svgId("area", points.map((point) => point.label).join("|"));
  const gridCount = 4;
  const peak = coords.reduce((best, item) => (item.value > best.value ? item : best), coords[0]);
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${ariaLabel}. Total ${formatValue(
          points.reduce((sum, point) => sum + point.value, 0),
        )}.`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridCount + 1 }, (_, index) => {
          const y = padTop + (plotHeight / gridCount) * index;
          return (
            <g key={`grid-${index}`}>
              <line
                x1={padLeft}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={index === gridCount ? 0.22 : 0.1}
                strokeDasharray={index === gridCount ? undefined : "3 6"}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {index === 0 ? "" : axisFormat(max - (max / gridCount) * index)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradient})`} className="chart-area" />
        <path
          d={line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line"
          style={{ "--line-length": 2600 } as React.CSSProperties}
        />

        <g className="chart-point" style={{ "--point-index": 0 } as React.CSSProperties}>
          <circle cx={peak.x} cy={peak.y} r="4.5" fill="var(--chart-1)" />
          <circle cx={peak.x} cy={peak.y} r="9" fill="var(--chart-1)" fillOpacity="0.15" />
        </g>

        {coords.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="8" fill="transparent">
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </circle>
            {index % labelEvery === 0 || index === coords.length - 1 ? (
              <text
                x={point.x}
                y={height - 9}
                textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}
                className="fill-muted-foreground text-[10px]"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** Vertical bars, for category or hour-of-day breakdowns. */
export function BarChart({
  items,
  formatValue = (value: number) => String(Math.round(value)),
  className,
  height = 200,
  ariaLabel = "Bar chart",
}: {
  items: Point[];
  formatValue?: (value: number) => string;
  className?: string;
  height?: number;
  ariaLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No data for this period.
      </p>
    );
  }

  const width = 520;
  const padX = 10;
  const padTop = 18;
  const padBottom = 30;
  const plotHeight = height - padTop - padBottom;
  const max = niceMax(Math.max(...items.map((item) => item.value)));
  const slot = (width - padX * 2) / items.length;
  const barWidth = Math.min(38, slot * 0.55);

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={padTop + plotHeight}
          y2={padTop + plotHeight}
          stroke="currentColor"
          strokeOpacity="0.18"
        />
        {items.map((item, index) => {
          const barHeight = max > 0 ? (item.value / max) * plotHeight : 0;
          const x = padX + slot * index + (slot - barWidth) / 2;
          const y = padTop + plotHeight - barHeight;
          return (
            <g key={`${item.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, item.value > 0 ? 2 : 0)}
                rx="6"
                fill="var(--chart-1)"
                fillOpacity={index === 0 ? 1 : 0.82}
                className="chart-bar"
                style={{ "--bar-index": index } as React.CSSProperties}
              >
                <title>{`${item.label}: ${formatValue(item.value)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

/** Category mix as a donut with a legend. */
export function DonutChart({
  items,
  formatValue = (value: number) => String(Math.round(value)),
  className,
}: {
  items: Point[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing sold in this period yet.
      </p>
    );
  }

  const size = 168;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-40 shrink-0 -rotate-90"
        role="img"
        aria-label="Share of sales by category"
      >
        {items.map((item, index) => {
          const fraction = item.value / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(dash - 2, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            >
              <title>{`${item.label}: ${formatValue(item.value)}`}</title>
            </circle>
          );
          offset += dash;
          return circle;
        })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{item.label}</span>
            </span>
            <span className="numeric shrink-0 font-medium">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal progress row used for stock coverage and targets. */
export function MeterRow({
  label,
  value,
  max,
  hint,
  tone = "primary",
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
  tone?: "primary" | "warning" | "destructive";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colour =
    tone === "destructive" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="numeric shrink-0 text-xs text-muted-foreground">
          {hint ?? `${value} / ${max}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", colour)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
