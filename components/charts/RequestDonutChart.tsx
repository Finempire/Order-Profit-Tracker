"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RequestDonutChartProps {
  pending: number;
  approved: number;
  rejected: number;
}

const COLORS = {
  Pending:  "#F59E0B",
  Approved: "#10B981",
  Rejected: "#EF4444",
};

const CustomTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <span className="font-semibold text-slate-800">{name}: </span>
        <span className="text-slate-600">{value} requests</span>
      </div>
    );
  }
  return null;
};

export function RequestDonutChart({ pending, approved, rejected }: RequestDonutChartProps) {
  const data = [
    { name: "Pending",  value: pending },
    { name: "Approved", value: approved },
    { name: "Rejected", value: rejected },
  ].filter((d) => d.value > 0);

  const total = pending + approved + rejected;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No request data yet
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px", color: "#64748B", paddingTop: "8px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: "-12px" }}>
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{total}</div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</div>
      </div>
    </div>
  );
}
