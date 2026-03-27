"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { NewOrderContent } from "@/components/orders/NewOrderContent";
import { Plus, Search, Trash2, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function OrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const role = session?.user?.role;
  const canCreate = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const isAdmin = role === "ADMIN";
  const isProduction = role === "PRODUCTION";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const limit = 20;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Order deleted");
        qc.invalidateQueries({ queryKey: ["orders"] });
        setDeleteConfirmId(null);
      } else {
        toast.error(res.error || "Failed to delete order");
      }
    },
  });

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

  // Cost health color
  const costColor = (est: number, inv: number) =>
    est <= 0 ? "text-slate-400" : inv > est ? "text-red-600 font-semibold" : inv / est > 0.95 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="p-4 lg:p-5 space-y-0" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* Excel-style Toolbar */}
      <div className="xls-toolbar">
        <div className="xls-toolbar-title">
          <span className="xls-toolbar-icon">XL</span>
          <span>Orders.xlsx</span>
          <span className="text-slate-400 font-normal text-xs ml-1">— {total} rows</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="xls-toolbar-btn pl-6 w-44"
            style={{ padding: "0.25rem 0.5rem 0.25rem 1.5rem", fontSize: "0.75rem" }}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="xls-toolbar-btn"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button onClick={() => qc.invalidateQueries({ queryKey: ["orders"] })} className="xls-toolbar-btn" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>

        {canCreate && (
          <button onClick={() => setShowNewOrderModal(true)} className="xls-toolbar-btn xls-toolbar-btn-primary">
            <Plus className="w-3 h-3" /> New Order
          </button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="xls-wrap">
        <table className="xls-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Order No.</th>
              <th>Order Date</th>
              <th>Buyer</th>
              {!isProduction && (
                <>
                  <th>Order Value</th>
                  <th>Est. Cost</th>
                  <th>Invoiced</th>
                  <th>Variance</th>
                </>
              )}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(isProduction ? 5 : 9)].map((_, j) => (
                    <td key={j}><div className="h-3 bg-slate-100 animate-pulse rounded w-16" /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={isProduction ? 5 : 9} className="py-12 text-center text-slate-400">
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
              <>
                {orders.map((order, idx) => {
                  const variance = order.estimatedCost > 0
                    ? ((order.invoicedCost - order.estimatedCost) / order.estimatedCost * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={order.id}>
                      <td>{(page - 1) * limit + idx + 1}</td>
                      <td>
                        <Link href={`/orders/${order.id}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: "#217346" }}>
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-slate-600 text-xs">{formatDate(order.orderDate)}</td>
                      <td className="font-medium">{order.buyer.name}</td>
                      {!isProduction && (
                        <>
                          <td className="xls-num">{formatCurrency(order.orderValue)}</td>
                          <td className="xls-num text-slate-500">{formatCurrency(order.estimatedCost)}</td>
                          <td className={`xls-num ${costColor(order.estimatedCost, order.invoicedCost)}`}>
                            {formatCurrency(order.invoicedCost)}
                          </td>
                          <td className={`xls-num text-xs ${order.estimatedCost > 0 && order.invoicedCost > order.estimatedCost ? "text-red-600" : "text-emerald-600"}`}>
                            {variance !== null ? `${Number(variance) > 0 ? "+" : ""}${variance}%` : "—"}
                          </td>
                        </>
                      )}
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/orders/${order.id}`} className="text-xs hover:underline font-medium" style={{ color: "#217346" }}>
                            View →
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmId(order.id)}
                              className="p-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                              title="Delete order"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Excel empty rows to fill the sheet */}
                {orders.length < 5 && [...Array(5 - orders.length)].map((_, i) => (
                  <tr key={`empty-${i}`} className="xls-empty">
                    {[...Array(isProduction ? 5 : 9)].map((_, j) => (
                      <td key={j}>{j === 0 ? orders.length + i + 1 : ""}</td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Status Bar */}
      <div className="xls-statusbar">
        <div className="flex items-center gap-3">
          <span className="xls-sheet-tab">Orders</span>
          <span className="text-white/60">Sheet1</span>
        </div>
        <div className="flex items-center gap-4">
          {!isProduction && orders.length > 0 && (
            <>
              <span>Total Value: {formatCurrency(orders.reduce((s, o) => s + o.orderValue, 0))}</span>
              <span>Invoiced: {formatCurrency(orders.reduce((s, o) => s + o.invoicedCost, 0))}</span>
            </>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">
                ‹
              </button>
              <span>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">
                ›
              </button>
            </div>
          )}
          <span className="text-white/60">Count: {total}</span>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-50 bg-white rounded shadow-2xl p-6 w-full max-w-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Order?</h3>
                <p className="text-sm text-slate-500">This will permanently delete the order and all its data.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="xls-toolbar-btn px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}

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
