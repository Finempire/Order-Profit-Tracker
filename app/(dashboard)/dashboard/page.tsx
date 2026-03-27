"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { RequestDonutChart } from "@/components/charts/RequestDonutChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import {
  Package, AlertTriangle, Clock, CreditCard, Check, X,
  ClipboardList, Loader2, ArrowRight,
  ShoppingCart, FileText, Users, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { NewPOContent } from "@/components/requests/NewPOContent";
import { NewOrderContent } from "@/components/orders/NewOrderContent";
import { POReviewModal } from "@/components/requests/POReviewModal";
import { useRouter } from "next/navigation";

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
    <div className="p-4 lg:p-5 space-y-4" style={{ background: "#f0f0f0", minHeight: "100%" }}>
      <div className="h-24 bg-white rounded border border-slate-200 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-300 rounded overflow-hidden">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white animate-pulse border-r border-slate-200" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-60 bg-white rounded border border-slate-200 animate-pulse" />
        <div className="h-60 bg-white rounded border border-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const role = session?.user?.role;

  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [showPOModal, setShowPOModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/requests/${id}/approve`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: (res, id) => {
      if (res.success) {
        toast.success("Request approved");
        setApprovedIds((prev) => new Set(Array.from(prev).concat(id)));
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else toast.error(res.error || "Failed to approve");
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
        setRejectOpenId(null);
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else toast.error(res.error || "Failed to reject");
    },
  });

  if (isLoading) return <DashboardSkeleton />;

  const orders   = data?.orders?.orders     || [];
  const requests = data?.requests?.requests  || [];
  const invoices = data?.invoices?.invoices  || [];
  const allReqs  = data?.allRequests?.requests || [];

  const pendingPaymentsTotal = invoices.reduce(
    (s: number, i: { totalAmount: number; paidAmount: number }) => s + (i.totalAmount - (i.paidAmount ?? 0)), 0
  );
  const overrunOrders = orders.filter(
    (o: { invoicedCost: number; estimatedCost: number }) => o.invoicedCost > o.estimatedCost
  ).length;
  const approvedCount = allReqs.filter((r: { status: string }) => r.status === "APPROVED").length;
  const rejectedCount = allReqs.filter((r: { status: string }) => r.status === "REJECTED").length;
  const pendingCount  = allReqs.filter((r: { status: string }) => r.status === "PENDING").length;

  const chartData = orders.slice(0, 10).map((o: { orderNumber: string; estimatedCost: number; invoicedCost: number }) => ({
    orderNumber: o.orderNumber,
    estimatedCost: o.estimatedCost,
    invoicedCost: o.invoicedCost,
  }));

  const canApprove   = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const isProduction = role === "PRODUCTION";
  const isFinance    = !isProduction;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 lg:p-5 space-y-4" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* ── Excel-style Welcome Header ── */}
      <div className="rounded border overflow-hidden" style={{ borderColor: "#217346" }}>
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3" style={{ background: "#217346" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center font-black text-white text-xs" style={{ background: "#1a5c37" }}>
              XL
            </div>
            <div>
              <div className="text-white/70 text-xs">{dateStr}</div>
              <div className="text-white font-bold text-base">
                Dashboard — {session?.user?.name?.split(" ")[0]}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProduction ? (
              <button
                onClick={() => setShowPOModal(true)}
                className="xls-toolbar-btn xls-toolbar-btn-primary"
                style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "white" }}
              >
                <ClipboardList className="w-3 h-3" /> Raise PO
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="xls-toolbar-btn"
                  style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "white" }}
                >
                  <Package className="w-3 h-3" /> New Order
                </button>
                <Link
                  href="/requests"
                  className="xls-toolbar-btn"
                  style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "white" }}
                >
                  <FileText className="w-3 h-3" /> Purchase Orders
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      {isFinance && (
        <div className="xls-kpi-grid">
          {[
            { label: "Active Orders", value: String(orders.length), sub: "in production", icon: Package, alert: false },
            { label: "Pending Approvals", value: String(requests.length), sub: requests.length > 0 ? "needs action" : "all clear", icon: Clock, alert: requests.length > 0 },
            { label: "Cost Overruns", value: String(overrunOrders), sub: "over budget", icon: AlertTriangle, alert: overrunOrders > 0 },
            { label: "Pending Payments", value: formatCurrency(pendingPaymentsTotal), sub: `${invoices.length} unpaid invoices`, icon: CreditCard, alert: pendingPaymentsTotal > 0 },
          ].map((kpi) => (
            <div key={kpi.label} className="xls-kpi-cell">
              <div className="flex items-start justify-between">
                <div>
                  <div className="xls-kpi-label">{kpi.label}</div>
                  <div className={`xls-kpi-value ${kpi.alert ? "text-red-700" : ""}`}>{kpi.value}</div>
                  <div className="xls-kpi-sub">{kpi.sub}</div>
                </div>
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${kpi.alert ? "bg-red-50" : "bg-slate-50"}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.alert ? "text-red-500" : "text-slate-400"}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isProduction && (
        <div className="xls-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="xls-kpi-cell">
            <div className="xls-kpi-label">My Pending</div>
            <div className="xls-kpi-value">{pendingCount}</div>
            <div className="xls-kpi-sub">awaiting approval</div>
          </div>
          <div className="xls-kpi-cell">
            <div className="xls-kpi-label">Approved</div>
            <div className="xls-kpi-value text-emerald-700">{approvedCount}</div>
            <div className="xls-kpi-sub">this period</div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      {isFinance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-300 border border-slate-300 rounded overflow-hidden">
          {[
            { label: "New Order", icon: ShoppingCart, onClick: () => setShowOrderModal(true), href: undefined },
            { label: "Raise PO", icon: ClipboardList, onClick: () => setShowPOModal(true), href: undefined },
            { label: "Buyers", icon: Users, href: "/buyers", onClick: undefined },
            { label: "Reports", icon: TrendingUp, href: "/reports", onClick: undefined },
          ].map((qa) => {
            const content = (
              <div className="flex flex-col items-center gap-1.5 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer w-full h-full">
                <qa.icon className="w-5 h-5" style={{ color: "#217346" }} />
                <span className="text-xs font-semibold text-slate-700">{qa.label}</span>
              </div>
            );
            return qa.href ? (
              <Link key={qa.label} href={qa.href}>{content}</Link>
            ) : (
              <button key={qa.label} onClick={qa.onClick}>{content}</button>
            );
          })}
        </div>
      )}

      {/* ── Charts ── */}
      {isFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cost Trend Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-300 rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between" style={{ background: "#f2f2f2" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cost Trend</span>
                <span className="text-xs text-slate-400">Estimated vs Actual</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-indigo-400 rounded inline-block" /> Estimated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" /> Actual
                </span>
              </div>
            </div>
            <div className="p-4">
              {chartData.length > 0 ? (
                <RevenueAreaChart data={chartData} />
              ) : (
                <EmptyState variant="orders" description="Create your first order to see cost trends." />
              )}
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white border border-slate-300 rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200" style={{ background: "#f2f2f2" }}>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Request Status</span>
              <div className="text-xs text-slate-400 mt-0.5">All-time breakdown</div>
            </div>
            <div className="p-4">
              <RequestDonutChart pending={pendingCount} approved={approvedCount} rejected={rejectedCount} />
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Approvals + Recent Orders ── */}
      <div className={`grid grid-cols-1 ${canApprove ? "lg:grid-cols-2" : ""} gap-4`}>

        {canApprove && (
          <div className="bg-white border border-slate-300 rounded overflow-hidden">
            {/* Table-style header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200" style={{ background: "#217346" }}>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xs uppercase tracking-wider">Pending Approvals</span>
                {requests.length > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded">{requests.length}</span>
                )}
              </div>
              <Link href="/requests?status=PENDING" className="text-xs text-white/70 hover:text-white flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {requests.length === 0 ? (
              <div className="px-5 py-8"><EmptyState variant="pending-approvals" /></div>
            ) : (
              <table className="w-full border-collapse" style={{ fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ background: "#f2f2f2" }}>
                    <th className="text-left px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">PO No.</th>
                    <th className="text-left px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Order · By</th>
                    <th className="text-right px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Amount</th>
                    <th className="text-center px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 6).map((req: {
                    id: string; requestNumber: string; requestType: string;
                    estimatedAmount: number; createdAt: string; description: string;
                    order: { orderNumber: string; id: string };
                    requestedBy: { name: string };
                  }) => (
                    <>
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setPreviewId(req.id)}
                            className="font-mono font-bold hover:underline"
                            style={{ color: "#217346" }}
                          >
                            {req.requestNumber}
                          </button>
                          <div className="mt-0.5"><StatusBadge status={req.requestType} /></div>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          <div>{req.order.orderNumber}</div>
                          <div className="text-slate-400">{req.requestedBy.name}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrency(req.estimatedAmount)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {approvedIds.has(req.id) ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                              <Check className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending && approveMutation.variables === req.id}
                                className="btn-approve">
                                {approveMutation.isPending && approveMutation.variables === req.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Check className="w-3 h-3" />}
                                OK
                              </button>
                              <button onClick={() => setRejectOpenId(rejectOpenId === req.id ? null : req.id)}
                                className="btn-reject">
                                <X className="w-3 h-3" /> No
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {rejectOpenId === req.id && (
                        <tr key={`${req.id}-reject`} className="bg-red-50 border-b border-red-100">
                          <td colSpan={4} className="px-3 pb-3 pt-2">
                            <p className="text-xs text-red-700 font-semibold mb-1">Reason for rejection:</p>
                            <textarea
                              className="form-input text-xs resize-none w-full"
                              rows={2}
                              placeholder="Explain why this request is being rejected..."
                              value={rejectNote[req.id] || ""}
                              onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1.5">
                              <button onClick={() => rejectMutation.mutate({ id: req.id, note: rejectNote[req.id] || "" })}
                                disabled={rejectMutation.isPending || !(rejectNote[req.id]?.trim())}
                                className="btn-danger text-xs py-1 px-3">
                                {rejectMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Confirm Reject
                              </button>
                              <button onClick={() => setRejectOpenId(null)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white border border-slate-300 rounded overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200" style={{ background: "#217346" }}>
            <span className="text-white font-bold text-xs uppercase tracking-wider">Recent Orders</span>
            <Link href="/orders" className="text-xs text-white/70 hover:text-white flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-8"><EmptyState variant="orders" ctaLabel="Create First Order" ctaHref="/orders/new" /></div>
          ) : (
            <table className="w-full border-collapse" style={{ fontSize: "0.75rem" }}>
              <thead>
                <tr style={{ background: "#f2f2f2" }}>
                  <th className="text-left px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Order No.</th>
                  <th className="text-left px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Buyer</th>
                  <th className="text-right px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Cost %</th>
                  <th className="text-center px-3 py-1.5 border-b border-slate-200 text-slate-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order: {
                  id: string; orderNumber: string; status: string; orderValue: number;
                  estimatedCost: number; invoicedCost: number;
                  buyer: { name: string };
                }) => {
                  const pct = order.estimatedCost > 0 ? Math.round((order.invoicedCost / order.estimatedCost) * 100) : 0;
                  const isOver = order.invoicedCost > order.estimatedCost;
                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/orders/${order.id}`} className="font-mono font-bold hover:underline" style={{ color: "#217346" }}>
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{order.buyer.name}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${isOver ? "text-red-600" : "text-emerald-600"}`}>
                        {order.estimatedCost > 0 ? `${pct}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <SlideUpModal isOpen={showPOModal} onClose={() => setShowPOModal(false)} title="New Purchase Order" maxWidth="3xl">
        <NewPOContent
          onClose={() => setShowPOModal(false)}
          onSuccess={({ number }) => {
            setShowPOModal(false);
            toast.success(`PO ${number} raised!`);
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      </SlideUpModal>

      <SlideUpModal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)} title="New Order" maxWidth="4xl">
        <NewOrderContent
          onClose={() => setShowOrderModal(false)}
          onSuccess={({ id }) => {
            setShowOrderModal(false);
            router.push(`/orders/${id}`);
          }}
        />
      </SlideUpModal>

      <POReviewModal
        requestId={previewId}
        onClose={() => setPreviewId(null)}
        canApprove={canApprove}
        onApproved={() => qc.invalidateQueries({ queryKey: ["dashboard"] })}
      />
    </div>
  );
}
