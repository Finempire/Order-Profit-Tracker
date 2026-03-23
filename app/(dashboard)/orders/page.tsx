"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { NewOrderContent } from "@/components/orders/NewOrderContent";
import { Plus, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type OrderRow = {
  id: string;
  orderNumber: string;
  orderDate: string;
  shippingDate: string | null;
  status: string;
  orderValue: number;
  estimatedCost: number;
  invoicedCost: number;
  costVariance: number;
  buyer: { name: string };
};

function CostHealthBar({ estimated, invoiced }: { estimated: number; invoiced: number }) {
  if (estimated <= 0) return <div className="text-xs text-slate-300">—</div>;
  const pct = Math.round((invoiced / estimated) * 100);
  const capped = Math.min(pct, 100);
  const barColor = pct <= 95 ? "cost-bar-green" : pct <= 105 ? "cost-bar-yellow" : "cost-bar-red";
  const labelColor = pct > 105 ? "text-red-600" : pct > 95 ? "text-amber-600" : "text-emerald-600";
  const Icon = pct > 105 ? TrendingUp : pct > 95 ? TrendingUp : TrendingDown;

  return (
    <div className="min-w-32">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`cost-bar-wrap flex-1`}>
          <div className={`cost-bar-fill ${barColor}`} style={{ width: `${capped}%` }} />
        </div>
        <span className={`text-xs font-bold tabular-nums ${labelColor}`}>{pct}%</span>
      </div>
      <div className={`text-xs flex items-center gap-1 ${labelColor}`}>
        <Icon className="w-3 h-3" />
        <span>{pct > 105 ? "Over budget" : pct > 95 ? "Near limit" : "Within budget"}</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const canCreate = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const isProduction = role === "PRODUCTION";
  const colCount = isProduction ? 4 : 9;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage]   = useState(1);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["orders", search, status, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(status && { status }),
      });
      return fetch(`/api/orders?${params}`).then((r) => r.json());
    },
  });

  const orders: OrderRow[] = data?.data?.orders || [];
  const total      = data?.data?.total      || 0;
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-400 text-sm">{total} total orders</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        )}
      </div>

      {/* Sticky search + filter bar */}
      <div className="card p-3 sticky top-0 z-10 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no. or buyer name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="form-input w-40"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table — desktop */}
      <div className="card p-0 hidden sm:block">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Order Date</th>
                <th>Buyer</th>
                {!isProduction && <><th>Order Value</th><th>Est. Cost</th><th>Invoiced</th><th>Cost Health</th></>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(colCount)].map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={colCount}>
                    {search || status ? (
                      <EmptyState variant="search" searchTerm={search || status} />
                    ) : (
                      <EmptyState
                        variant="orders"
                        ctaLabel={canCreate ? "+ Create First Order" : undefined}
                        ctaHref={canCreate ? "/orders/new" : undefined}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className={!isProduction && order.invoicedCost > order.estimatedCost && order.estimatedCost > 0 ? "row-overrun" : ""}>
                    <td>
                      <Link href={`/orders/${order.id}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-sm text-slate-500">{formatDate(order.orderDate)}</td>
                    <td className="font-medium text-slate-900">{order.buyer.name}</td>
                    {!isProduction && (
                      <>
                        <td className="num">{formatCurrency(order.orderValue)}</td>
                        <td className="num text-slate-500">{formatCurrency(order.estimatedCost)}</td>
                        <td className={`num font-semibold ${order.invoicedCost > order.estimatedCost && order.estimatedCost > 0 ? "text-red-600" : "text-slate-700"}`}>
                          {formatCurrency(order.invoicedCost)}
                        </td>
                        <td><CostHealthBar estimated={order.estimatedCost} invoiced={order.invoicedCost} /></td>
                      </>
                    )}
                    <td><StatusBadge status={order.status} /></td>
                    <td>
                      <Link href={`/orders/${order.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))
        ) : orders.length === 0 ? (
          <EmptyState
            variant={search ? "search" : "orders"}
            searchTerm={search}
            ctaLabel={canCreate ? "+ Create First Order" : undefined}
            ctaHref={canCreate ? "/orders/new" : undefined}
          />
        ) : (
          orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="mobile-card block">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-blue-600">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="text-sm font-medium text-slate-800">{order.buyer.name}</div>
              {!isProduction && (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                    <span>Value: <span className="tabular-nums font-medium">{formatCurrency(order.orderValue)}</span></span>
                    <span>Invoiced: <span className={`tabular-nums font-medium ${order.invoicedCost > order.estimatedCost ? "text-red-600" : ""}`}>{formatCurrency(order.invoicedCost)}</span></span>
                  </div>
                  <CostHealthBar estimated={order.estimatedCost} invoiced={order.invoicedCost} />
                </>
              )}
              <div className="text-xs text-slate-400">{formatDate(order.orderDate)}</div>
            </Link>
          ))
        )}
      </div>

      {/* New Order Modal */}
      <SlideUpModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        title="New Order"
        maxWidth="4xl"
      >
        <NewOrderContent
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={({ id }) => {
            setShowNewOrderModal(false);
            router.push(`/orders/${id}`);
          }}
        />
      </SlideUpModal>
    </div>
  );
}
