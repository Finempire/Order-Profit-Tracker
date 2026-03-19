"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function OrdersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canCreate = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
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

  const orders = data?.data?.orders || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm">{total} total orders</p>
        </div>
        {canCreate && (
          <Link href="/orders/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Order
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no. or buyer..."
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

      {/* Table */}
      <div className="card p-0">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Order Date</th>
                <th>Shipping Date</th>
                <th>Buyer</th>
                <th>Order Value</th>
                <th>Est. Cost</th>
                <th>Invoiced</th>
                <th>Variance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-slate-100 animate-pulse rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order: {
                  id: string; orderNumber: string; orderDate: string; shippingDate: string | null;
                  status: string; orderValue: number; estimatedCost: number; invoicedCost: number;
                  costVariance: number; buyer: { name: string };
                }) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline font-mono text-sm">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-sm text-slate-600">{formatDate(order.orderDate)}</td>
                    <td className="text-sm text-slate-500">{order.shippingDate ? formatDate(order.shippingDate) : "—"}</td>
                    <td className="font-medium text-slate-900">{order.buyer.name}</td>
                    <td className="font-semibold">{formatCurrency(order.orderValue)}</td>
                    <td>{formatCurrency(order.estimatedCost)}</td>
                    <td>{formatCurrency(order.invoicedCost)}</td>
                    <td>
                      <span className={`text-sm font-medium ${order.costVariance > 0 ? "text-red-600" : order.costVariance < 0 ? "text-green-600" : "text-slate-400"}`}>
                        {order.costVariance > 0 ? "+" : ""}{formatCurrency(order.costVariance)}
                      </span>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/orders/${order.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                        {canCreate && (
                          <Link href={`/orders/${order.id}/edit`} className="text-xs text-slate-500 hover:underline">Edit</Link>
                        )}
                      </div>
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
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
