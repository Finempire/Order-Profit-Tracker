"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CostDataPoint {
  orderNumber: string;
  estimatedCost: number;
  invoicedCost: number;
}

interface CostBarChartProps {
  data: CostDataPoint[];
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-48">
        <p className="font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wide">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 my-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-slate-500 text-xs">{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        {payload.length === 2 && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-400">Variance</span>
            <span className={`font-semibold tabular-nums ${
              payload[1].value > payload[0].value ? "text-red-600" : "text-emerald-600"
            }`}>
              {payload[1].value > payload[0].value ? "+" : ""}
              {formatCurrency(payload[1].value - payload[0].value)}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function CostBarChart({ data }: CostBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="orderNumber"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241,245,249,0.8)" }} />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#64748B", paddingTop: "12px" }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine y={0} stroke="#E2E8F0" />
        <Bar dataKey="estimatedCost" name="Estimated Cost" fill="#BFDBFE" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => (
            <Cell key={i} fill="#BFDBFE" />
          ))}
        </Bar>
        <Bar dataKey="invoicedCost" name="Actual Invoiced" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.invoicedCost > entry.estimatedCost ? "#EF4444" : "#2563EB"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
