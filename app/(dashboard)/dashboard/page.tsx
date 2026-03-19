"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/shared/CostCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CostBarChart } from "@/components/charts/CostBarChart";
import { RequestDonutChart } from "@/components/charts/RequestDonutChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Package, AlertTriangle, Clock, CreditCard,
  Check, X, ExternalLink, ClipboardList, Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

async function fetchDashboardData() {
  const [ordersRes, requestsRes, invoicesRes, allRequestsRes] = await Promise.all([
    fetch("/api/orders?limit=10&status=ACTIVE").then((r) => r.json()),
    fetch("/api/requests?status=PENDING&limit=50").then((r) => r.json()),
    fetch("/api/invoices?paymentStatus=UNPAID&limit=100").then((r) => r.json()),
    fetch("/api/requests?limit=200").then((r) => r.json()),
  ]);
  return {
    orders: ordersRes.data,
    requests: requestsRes.data,
    invoices: invoicesRes.data,
    allRequests: allRequestsRes.data,
  };
}

function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton skeleton-title w-40 mb-2" />
          <div className="skeleton skeleton-text w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton skeleton-kpi" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="skeleton lg:col-span-2" style={{ height: 300 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const role = session?.user?.role;

  // Inline reject state per-request
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/requests/${id}/approve`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: (res, id) => {
      if (res.success) {
        toast.success("Request approved ✅");
        setApprovedIds((prev) => new Set(Array.from(prev).concat(id)));
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
    onSuccess: (res, { id }) => {
      if (res.success) {
        toast.success("Request rejected");
        setRejectOpenId(null);
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        toast.error(res.error || "Failed to reject");
      }
    },
  });

  if (isLoading) return <DashboardSkeleton />;

  const orders   = data?.orders?.orders || [];
  const requests = data?.requests?.requests || [];
  const invoices = data?.invoices?.invoices || [];
  const allReqs  = data?.allRequests?.requests || [];

  const pendingPaymentsTotal = invoices.reduce(
    (s: number, i: { totalAmount: number; paidAmount: number }) =>
      s + (i.totalAmount - (i.paidAmount ?? 0)),
    0
  );
  const overrunOrders = orders.filter(
    (o: { invoicedCost: number; estimatedCost: number }) =>
      o.invoicedCost > o.estimatedCost
  ).length;

  const approvedCount = allReqs.filter((r: { status: string }) => r.status === "APPROVED").length;
  const rejectedCount = allReqs.filter((r: { status: string }) => r.status === "REJECTED").length;
  const pendingCount  = allReqs.filter((r: { status: string }) => r.status === "PENDING").length;

  const chartData = orders.slice(0, 10).map((o: {
    orderNumber: string; estimatedCost: number; invoicedCost: number
  }) => ({
    orderNumber: o.orderNumber,
    estimatedCost: o.estimatedCost,
    invoicedCost: o.invoicedCost,
  }));

  const canApprove    = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const isProduction  = role === "PRODUCTION";
  const isFinanceRole = !isProduction;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{dateStr}</p>
        </div>
        {isProduction && (
          <Link href="/requests/new" className="btn-primary">
            <ClipboardList className="w-4 h-4" />
            Raise Request
          </Link>
        )}
      </div>

      {/* ── KPI Cards (finance roles) ─────────────────────────────── */}
      {isFinanceRole && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Orders"
            value={orders.length}
            icon={Package}
            iconVariant="blue"
            subLabel="currently in production"
          />
          <KpiCard
            label="Cost Overruns"
            value={overrunOrders}
            icon={AlertTriangle}
            iconVariant="red"
            subLabel="orders over budget"
          />
          <KpiCard
            label="Pending Approvals"
            value={requests.length}
            icon={Clock}
            iconVariant="amber"
            subLabel={requests.length > 0 ? "needs action" : "all clear ✓"}
          />
          <KpiCard
            label="Pending Payments"
            value={pendingPaymentsTotal}
            icon={CreditCard}
            iconVariant="green"
            isCurrency
            subLabel={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* ── Production: My Requests widget ────────────────────────── */}
      {isProduction && (
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            label="My Requests"
            value={allReqs.filter((r: { status: string }) => r.status === "PENDING").length}
            icon={Clock}
            iconVariant="amber"
            subLabel="awaiting approval"
          />
          <KpiCard
            label="Approved"
            value={allReqs.filter((r: { status: string }) => r.status === "APPROVED").length}
            icon={Package}
            iconVariant="green"
            subLabel="this month"
          />
        </div>
      )}

      {/* ── Charts row (finance only) ──────────────────────────────── */}
      {isFinanceRole && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cost Bar Chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Cost Overview</h2>
                <p className="text-xs text-slate-400 mt-0.5">Estimated vs Actual — last 10 orders</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" /> Estimated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Over budget
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <CostBarChart data={chartData} />
            ) : (
              <EmptyState variant="orders" description="Create your first order to see cost trends here." />
            )}
          </div>

          {/* Donut Chart */}
          <div className="card">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-slate-900">Request Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">All time breakdown</p>
            </div>
            <RequestDonutChart
              pending={pendingCount}
              approved={approvedCount}
              rejected={rejectedCount}
            />
          </div>
        </div>
      )}

      {/* ── Pending Approvals + Recent Orders row ─────────────────── */}
      <div className={`grid grid-cols-1 ${canApprove ? "lg:grid-cols-2" : ""} gap-4`}>

        {/* Pending Approvals quick panel */}
        {canApprove && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Pending Approvals</h2>
                {requests.length > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5 font-medium">{requests.length} request{requests.length !== 1 ? "s" : ""} waiting</p>
                )}
              </div>
              <Link href="/requests?status=PENDING" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {requests.length === 0 ? (
              <EmptyState variant="pending-approvals" />
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 8).map((req: {
                  id: string; requestNumber: string; requestType: string;
                  estimatedAmount: number; createdAt: string; description: string;
                  order: { orderNumber: string; id: string };
                  requestedBy: { name: string };
                }) => (
                  <div key={req.id} className="border border-slate-100 rounded-lg overflow-hidden">
                    {/* Row */}
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-blue-600">{req.requestNumber}</span>
                          <StatusBadge status={req.requestType} />
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          <Link href={`/orders/${req.order.id}`} className="text-slate-700 hover:text-blue-600 font-medium hover:underline">
                            {req.order.orderNumber}
                          </Link>
                          {" · "}{req.requestedBy.name}
                          {" · "}{formatDate(req.createdAt)}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm font-bold text-slate-900 tabular-nums text-right">{formatCurrency(req.estimatedAmount)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {approvedIds.has(req.id) ? (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending && approveMutation.variables === req.id}
                              className="btn-approve"
                            >
                              {approveMutation.isPending && approveMutation.variables === req.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectOpenId(rejectOpenId === req.id ? null : req.id)}
                              className="btn-reject"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline reject panel */}
                    {rejectOpenId === req.id && (
                      <div className="reject-inline px-3 pb-3 pt-2 bg-red-50 border-t border-red-100">
                        <p className="text-xs text-red-700 font-medium mb-1.5">Reason for rejection:</p>
                        <textarea
                          className="form-input text-sm resize-none"
                          rows={2}
                          placeholder="Explain why this request is being rejected..."
                          value={rejectNote[req.id] || ""}
                          onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() =>
                              rejectMutation.mutate({ id: req.id, note: rejectNote[req.id] || "" })
                            }
                            disabled={rejectMutation.isPending || !(rejectNote[req.id]?.trim())}
                            className="btn-danger text-xs py-1.5 px-3"
                          >
                            {rejectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => setRejectOpenId(null)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState
              variant="orders"
              ctaLabel="Create First Order"
              ctaHref="/orders/new"
            />
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 6).map((order: {
                id: string; orderNumber: string; status: string; orderValue: number;
                estimatedCost: number; invoicedCost: number; costVariance: number;
                buyer: { name: string };
              }) => {
                const pct = order.estimatedCost > 0
                  ? Math.round((order.invoicedCost / order.estimatedCost) * 100)
                  : 0;
                const barColor = pct <= 95 ? "cost-bar-green" : pct <= 105 ? "cost-bar-yellow" : "cost-bar-red";
                const isOver = order.invoicedCost > order.estimatedCost;

                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block border border-slate-100 rounded-lg px-3 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-semibold text-blue-600">{order.orderNumber}</span>
                        <span className="text-xs text-slate-500 truncate">{order.buyer.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={order.status} />
                        <span className={`text-xs font-bold tabular-nums ${isOver ? "text-red-600" : "text-slate-700"}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="cost-bar-wrap">
                      <div
                        className={`cost-bar-fill ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Est: <span className="tabular-nums">{formatCurrency(order.estimatedCost)}</span></span>
                      <span>Actual: <span className={`tabular-nums font-medium ${isOver ? "text-red-600" : "text-slate-600"}`}>{formatCurrency(order.invoicedCost)}</span></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
