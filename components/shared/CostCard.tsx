"use client";

import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconVariant?: "blue" | "amber" | "red" | "green";
  subLabel?: string;
  isCurrency?: boolean;
  trend?: { value: number; label?: string };
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconVariant = "blue",
  subLabel,
  isCurrency = false,
  trend,
  onClick,
}: KpiCardProps) {
  const iconClass = {
    blue:  "kpi-icon-blue",
    amber: "kpi-icon-amber",
    red:   "kpi-icon-red",
    green: "kpi-icon-green",
  }[iconVariant];

  const displayValue = isCurrency
    ? formatCurrency(Number(value))
    : String(value);

  const isTrendUp   = (trend?.value ?? 0) > 0;
  const isTrendDown = (trend?.value ?? 0) < 0;

  return (
    <div
      className={`kpi-card ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className={`kpi-icon-circle ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="kpi-label">{label}</div>
      <div
        className={`kpi-value ${
          iconVariant === "red" ? "text-red-600" :
          iconVariant === "amber" ? "text-amber-700" :
          iconVariant === "green" ? "text-emerald-700" :
          "text-slate-900"
        }`}
      >
        {displayValue}
      </div>
      {subLabel && <div className="kpi-sub">{subLabel}</div>}
      {trend !== undefined && (
        <div
          className={`kpi-trend ${
            isTrendUp ? "text-red-600" : isTrendDown ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {isTrendUp ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isTrendDown ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span>
            {Math.abs(trend.value)}
            {trend.label ? ` ${trend.label}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// Legacy CostCard — kept for backward compat on order detail page
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
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger:  "text-red-600",
  };

  const isOverBudget  = (variance ?? 0) > 0;
  const isUnderBudget = (variance ?? 0) < 0;

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorMap[variant]}`}>{formatCurrency(value)}</div>
      {subLabel && <div className="kpi-sub">{subLabel}</div>}
      {showVariance && variance !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium mt-1 ${
            isOverBudget ? "text-red-600" : isUnderBudget ? "text-emerald-600" : "text-slate-500"
          }`}
        >
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
              ({Math.abs(variancePct).toFixed(1)}%{" "}
              {isOverBudget ? "over" : isUnderBudget ? "under" : ""})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
