import React, { useEffect, useMemo, useState } from "react";
import { ChartContainer } from "./ui/line-charts-2";
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis } from "recharts";

const TF_ORDER = ["1D", "1W", "1M", "3M", "6M", "YTD"];

const buildDummySeries = (points = 200) => {
  const base = 4.5;
  const data = [];
  for (let i = 0; i < points; i += 1) {
    const wave = Math.sin(i / 18) * 1.1 + Math.cos(i / 9) * 0.4;
    const drift = (i / points) * 1.6;
    const noise = ((i % 7) - 3) * 0.03;
    data.push({
      label: `D${i + 1}`,
      returnPct: Number((base + wave + drift + noise).toFixed(2)),
    });
  }
  return data;
};

const sliceForTF = (data, tf) => {
  const n = data.length;
  if (tf === "1D") return data.slice(Math.max(0, n - 2));
  if (tf === "1W") return data.slice(Math.max(0, n - 7));
  if (tf === "1M") return data.slice(Math.max(0, n - 30));
  if (tf === "3M") return data.slice(Math.max(0, n - 90));
  if (tf === "6M") return data.slice(Math.max(0, n - 180));
  if (tf === "1Y") return data.slice(Math.max(0, n - 365));
  if (tf === "YTD") return data.slice(Math.max(0, n - 120));
  return data;
};

export function StrategyReturnHeaderChart({ series, onValueChange }) {
  const [tf, setTf] = useState("6M");
  const fallbackSeries = useMemo(() => buildDummySeries(), []);
  const resolvedSeries = series?.length ? series : fallbackSeries;
  const filtered = useMemo(() => sliceForTF(resolvedSeries, tf), [resolvedSeries, tf]);
  const lastIndex = filtered.length - 1;
  const lastValue = filtered[lastIndex]?.returnPct ?? 0;
  const chartConfig = {
    returnPct: {
      label: "Return",
      color: "var(--color-mint-purple, #7C5CFF)",
    },
  };
  const renderLastDot = ({ cx, cy, index }) => {
    if (index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#C7B8FF" className="animate-pulse" opacity={0.5} />
        <circle cx={cx} cy={cy} r={4} fill="#7C5CFF" />
      </g>
    );
  };

  useEffect(() => {
    if (onValueChange) {
      onValueChange(lastValue);
    }
  }, [lastValue, onValueChange]);

  return (
    <div className="space-y-4">
      <ChartContainer
        config={chartConfig}
        className="h-[220px] w-full overflow-visible"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={{ top: 10, right: 12, left: -6, bottom: 10 }}
            onMouseMove={(state) => {
              if (!onValueChange) return;
              const payload = state?.activePayload?.[0]?.value;
              if (typeof payload === "number") {
                onValueChange(payload);
              }
            }}
            onMouseLeave={() => {
              if (onValueChange) {
                onValueChange(lastValue);
              }
            }}
          >
            <defs>
              <linearGradient id="returnGradientMint" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.returnPct.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={chartConfig.returnPct.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              dy={8}
            />

            <Area
              type="monotone"
              dataKey="returnPct"
              stroke="transparent"
              fill="url(#returnGradientMint)"
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="returnPct"
              stroke={chartConfig.returnPct.color}
              strokeWidth={2}
              dot={renderLastDot}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TF_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTf(key)}
            className={[
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold",
              tf === key
                ? "border-transparent bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600",
            ].join(" ")}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
