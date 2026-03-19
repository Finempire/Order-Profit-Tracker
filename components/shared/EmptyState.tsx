"use client";

import React from "react";
import Link from "next/link";

type EmptyVariant =
  | "orders"
  | "requests"
  | "buyers"
  | "vendors"
  | "invoices"
  | "payments"
  | "pending-approvals"
  | "search"
  | "generic";

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  searchTerm?: string;
}

const DEFAULTS: Record<EmptyVariant, { icon: string; title: string; description: string }> = {
  orders: {
    icon: "📦",
    title: "No orders yet",
    description: "Orders you receive will appear here with full cost tracking.",
  },
  requests: {
    icon: "📋",
    title: "No purchase requests",
    description: "Requests raised by your team will appear here for review.",
  },
  buyers: {
    icon: "👥",
    title: "No buyers added",
    description: "Add buyers to start creating orders and tracking costs.",
  },
  vendors: {
    icon: "🏭",
    title: "No vendors added",
    description: "Add vendors to associate them with purchase invoices.",
  },
  invoices: {
    icon: "🧾",
    title: "No invoices yet",
    description: "Vendor invoices linked to approved requests will appear here.",
  },
  payments: {
    icon: "💰",
    title: "No payments recorded",
    description: "Mark invoices as paid and payment proof uploads will appear here.",
  },
  "pending-approvals": {
    icon: "🎉",
    title: "You're all caught up!",
    description: "No pending requests to review right now.",
  },
  search: {
    icon: "🔍",
    title: "No results found",
    description: "Try a different search term or clear the filters.",
  },
  generic: {
    icon: "📂",
    title: "Nothing here yet",
    description: "Data will appear here once available.",
  },
};

export function EmptyState({
  variant = "generic",
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
  searchTerm,
}: EmptyStateProps) {
  const defaults = DEFAULTS[variant];
  const displayTitle = title ?? defaults.title;
  const displayDescription = searchTerm
    ? `No results for "${searchTerm}"`
    : (description ?? defaults.description);

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{defaults.icon}</div>
      <h3>{displayTitle}</h3>
      <p>{displayDescription}</p>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn-primary">
          {ctaLabel}
        </Link>
      )}
      {onCta && ctaLabel && !ctaHref && (
        <button onClick={onCta} className="btn-primary">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
