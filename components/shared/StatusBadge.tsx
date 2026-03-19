"use client";

type StatusType =
  | "PENDING" | "APPROVED" | "REJECTED"
  | "ACTIVE" | "COMPLETED" | "CANCELLED"
  | "PAID" | "PARTIAL" | "UNPAID"
  | "MATERIAL" | "EXPENSE"
  | "PROVISIONAL" | "TAX" | "OTHER";

const MAP: Record<StatusType, { label: string; className: string }> = {
  PENDING:     { label: "Pending",     className: "badge badge-pending" },
  APPROVED:    { label: "Approved",    className: "badge badge-approved" },
  REJECTED:    { label: "Rejected",    className: "badge badge-rejected" },
  ACTIVE:      { label: "Active",      className: "badge badge-active" },
  COMPLETED:   { label: "Completed",   className: "badge badge-completed" },
  CANCELLED:   { label: "Cancelled",   className: "badge badge-cancelled" },
  PAID:        { label: "Paid",        className: "badge badge-paid" },
  PARTIAL:     { label: "Partial",     className: "badge badge-partial" },
  UNPAID:      { label: "Unpaid",      className: "badge badge-unpaid" },
  MATERIAL:    { label: "Material",    className: "badge badge-material" },
  EXPENSE:     { label: "Expense",     className: "badge badge-expense" },
  PROVISIONAL: { label: "Provisional", className: "badge badge-pending" },
  TAX:         { label: "Tax Inv.",    className: "badge badge-approved" },
  OTHER:       { label: "Other",       className: "badge badge-cancelled" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = MAP[status as StatusType] || { label: status, className: "badge badge-cancelled" };
  return <span className={info.className}>{info.label}</span>;
}
