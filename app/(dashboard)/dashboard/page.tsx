"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CostCard } from "@/components/shared/CostCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RejectModal } from "@/components/shared/RejectModal";
import { CostBarChart } from "@/components/charts/CostBarChart";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Check, X, ExternalLink, TrendingDown, AlertTriangle, Clock, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

async function fetchDashboardData() {
  const [ordersRes, requestsRes, invoicesRes] = await Promise.all([
    fetch("/api/orders?limit=10&status=ACTIVE").then((r) => r.json()),
    fetch("/api/requests?status=PENDING&limit=50").then((r) => r.json()),
    fetch("/api/invoices?paymentStatus=UNPAID&limit=100").then((r) => r.json()),
  ]);
  return { orders: ordersRes.data, requests: requestsRes.data, invoices: invoicesRes.data };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; number: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/requests/${id}/approve`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Request approved");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        toast.error(res.error || "Failed to approve");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      fetch(`/api/requests/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote: note }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Request rejected");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        setRejectOpen(false);
      } else {
        toast.error(res.error || "Failed to reject");
      }
    },
  });

  const orders = data?.orders?.orders || [];
  const requests = data?.requests?.requests || [];
  const invoices = data?.invoices?.invoices || [];

  const pendingPaymentsTotal = invoices.reduce((s: number, i: { totalAmount: number; paidAmount: number }) => s + (i.totalAmount - i.paidAmount), 0);
  const overrunOrders = orders.filter((o: { costVariance: number }) => o.costVariance > 0).length;

  // Build cost chart data from last 10 orders
  const chartData = orders.slice(0, 10).map((o: { orderNumber: string; estimatedCost: number; invoicedCost: number }) => ({
    orderNumber: o.orderNumber,
    estimatedCost: o.estimatedCost,
    invoicedCost: o.invoicedCost,
  }));

  const role = session?.user?.role;
  const canApprove = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of manufacturing orders and costs</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-blue-500" /> Active Orders
          </div>
          <div className="kpi-value">{orders.length}</div>
          <div className="kpi-sub">currently in production</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Cost Overruns
          </div>
          <div className="kpi-value text-red-600">{overrunOrders}</div>
          <div className="kpi-sub">orders over budget</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Approvals
          </div>
          <div className="kpi-value text-amber-600">{requests.length}</div>
          <div className="kpi-sub">requests awaiting action</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-green-500" /> Pending Payments
          </div>
          <div className="kpi-value text-slate-900 text-xl">{formatCurrency(pendingPaymentsTotal)}</div>
          <div className="kpi-sub">outstanding balance</div>
        </div>
      </div>

      {/* Cost Overview Chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Cost Overview — Last 10 Orders</h2>
        {chartData.length > 0 ? (
          <CostBarChart data={chartData} />
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
            No order data yet
          </div>
        )}
      </div>

      {/* Pending Approvals Table */}
      {canApprove && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Pending Approvals</h2>
            <Link href="/requests?status=PENDING" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No pending requests</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req No.</th>
                    <th>Order No.</th>
                    <th>Raised By</th>
                    <th>Type</th>
                    <th>Est. Amount</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 10).map((req: {
                    id: string; requestNumber: string; requestType: string; estimatedAmount: number; createdAt: string;
                    order: { orderNumber: string; id: string }; requestedBy: { name: string };
                  }) => (
                    <tr key={req.id}>
                      <td><span className="font-mono text-xs font-medium text-blue-600">{req.requestNumber}</span></td>
                      <td>
                        <Link href={`/orders/${req.order.id}`} className="text-blue-600 hover:underline text-sm">
                          {req.order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-slate-600">{req.requestedBy.name}</td>
                      <td><StatusBadge status={req.requestType} /></td>
                      <td className="font-medium">{formatCurrency(req.estimatedAmount)}</td>
                      <td className="text-slate-500 text-xs">{formatDate(req.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => { setRejectTarget({ id: req.id, number: req.requestNumber }); setRejectOpen(true); }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No orders yet</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Buyer</th>
                  <th>Order Value</th>
                  <th>Invoiced</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((order: {
                  id: string; orderNumber: string; status: string; orderValue: number;
                  invoicedCost: number; costVariance: number; buyer: { name: string };
                }) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline text-sm">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-slate-700">{order.buyer.name}</td>
                    <td className="font-medium">{formatCurrency(order.orderValue)}</td>
                    <td>{formatCurrency(order.invoicedCost)}</td>
                    <td>
                      <span className={`text-sm font-medium ${order.costVariance > 0 ? "text-red-600" : order.costVariance < 0 ? "text-green-600" : "text-slate-500"}`}>
                        {order.costVariance > 0 ? "+" : ""}{formatCurrency(order.costVariance)}
                      </span>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RejectModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(note) => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, note })}
        requestNumber={rejectTarget?.number}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
