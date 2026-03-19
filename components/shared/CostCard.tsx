"use client";

import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CostCardProps {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "danger";
  subLabel?: string;
  showVariance?: boolean;
  variance?: number;
  variancePct?: number;
}

export function CostCard({
  label,
  value,
  variant = "default",
  subLabel,
  showVariance,
  variance,
  variancePct,
}: CostCardProps) {
  const colorMap = {
    default: "text-slate-900",
    success: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-600",
  };

  const isOverBudget = (variance ?? 0) > 0;
  const isUnderBudget = (variance ?? 0) < 0;

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorMap[variant]}`}>{formatCurrency(value)}</div>
      {subLabel && <div className="kpi-sub">{subLabel}</div>}
      {showVariance && variance !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
          isOverBudget ? "text-red-600" : isUnderBudget ? "text-green-600" : "text-slate-500"
        }`}>
          {isOverBudget ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isUnderBudget ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          {formatCurrency(Math.abs(variance))}
          {variancePct !== undefined && (
            <span className="text-slate-400 font-normal">
              ({Math.abs(variancePct).toFixed(1)}% {isOverBudget ? "over" : isUnderBudget ? "under" : ""})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
