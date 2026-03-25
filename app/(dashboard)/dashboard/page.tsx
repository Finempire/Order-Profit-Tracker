"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StatCard } from "@/components/shared/CostCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RevenueAreaChart } from "@/components/charts/RevenueAreaChart";
import { RequestDonutChart } from "@/components/charts/RequestDonutChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Package, AlertTriangle, Clock, CreditCard, Check, X,
  ClipboardList, Loader2, TrendingUp, ArrowRight,
  ShoppingCart, FileText, Users, Zap,
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
    <div className="p-4 lg:p-6 space-y-5">
      <div className="skeleton rounded-2xl" style={{ height: 96 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 112 }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="skeleton lg:col-span-2 rounded-2xl" style={{ height: 280 }} />
        <div className="skeleton rounded-2xl" style={{ height: 280 }} />
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
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Welcome Banner ────────────────────────── */}
      <div className="dash-welcome">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/60 text-sm font-medium mb-1">{dateStr}</p>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {greeting}, {session?.user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-white/60 text-sm mt-1.5">
              {isProduction
                ? `You have ${pendingCount} request${pendingCount !== 1 ? "s" : ""} pending approval.`
                : `${orders.length} active orders · ${requests.length} pending approval${requests.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isProduction ? (
              <button
                onClick={() => setShowPOModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-sm hover:bg-white/90 transition-all shadow-lg"
              >
                <ClipboardList className="w-4 h-4" /> Raise Request
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-sm hover:bg-white/90 transition-all shadow-lg"
                >
                  <Package className="w-4 h-4" /> New Order
                </button>
                <Link
                  href="/requests"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur text-white font-semibold rounded-xl text-sm hover:bg-white/20 transition-all border border-white/20"
                >
                  <FileText className="w-4 h-4" /> Requests
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────── */}
      {isFinance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Orders"
            value={orders.length}
            icon={Package}
            variant="blue"
            subLabel="currently in production"
            className="stagger-1"
          />
          <StatCard
            label="Pending Approvals"
            value={requests.length}
            icon={Clock}
            variant="amber"
            subLabel={requests.length > 0 ? "needs your action" : "all clear"}
            className="stagger-2"
          />
          <StatCard
            label="Cost Overruns"
            value={overrunOrders}
            icon={AlertTriangle}
            variant="rose"
            subLabel="orders over budget"
            className="stagger-3"
          />
          <StatCard
            label="Pending Payments"
            value={pendingPaymentsTotal}
            icon={CreditCard}
            variant="emerald"
            isCurrency
            subLabel={`${invoices.length} unpaid invoice${invoices.length !== 1 ? "s" : ""}`}
            className="stagger-4"
          />
        </div>
      )}

      {/* Production stat cards */}
      {isProduction && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="My Pending"
            value={allReqs.filter((r: { status: string }) => r.status === "PENDING").length}
            icon={Clock}
            variant="amber"
            subLabel="awaiting approval"
            className="stagger-1"
          />
          <StatCard
            label="Approved"
            value={allReqs.filter((r: { status: string }) => r.status === "APPROVED").length}
            icon={Package}
            variant="emerald"
            subLabel="this period"
            className="stagger-2"
          />
        </div>
      )}

      {/* ── Charts row ──────────────────────────────── */}
      {isFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Chart */}
          <div className="card lg:col-span-2 p-5" style={{ animation: "staggerFadeUp 0.5s 0.2s both" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Cost Trend</h2>
                <p className="text-xs text-slate-400 mt-0.5">Estimated vs Actual — last {chartData.length} orders</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block" />
                  Estimated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
                  Actual
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <RevenueAreaChart data={chartData} />
            ) : (
              <EmptyState variant="orders" description="Create your first order to see cost trends." />
            )}
          </div>

          {/* Donut Chart */}
          <div className="card p-5" style={{ animation: "staggerFadeUp 0.5s 0.3s both" }}>
            <div className="mb-3">
              <h2 className="font-bold text-slate-900 text-base">Request Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">All-time breakdown</p>
            </div>
            <RequestDonutChart pending={pendingCount} approved={approvedCount} rejected={rejectedCount} />
          </div>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────── */}
      {isFinance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animation: "staggerFadeUp 0.5s 0.35s both" }}>
          {[
            { label: "New Order", icon: ShoppingCart, href: undefined, onClick: () => setShowOrderModal(true), color: "bg-blue-50 text-blue-600" },
            { label: "Raise PO",  icon: ClipboardList, href: undefined, onClick: () => setShowPOModal(true),   color: "bg-violet-50 text-violet-600" },
            { label: "Buyers",    icon: Users,          href: "/buyers", onClick: undefined,                    color: "bg-emerald-50 text-emerald-600" },
            { label: "Reports",   icon: TrendingUp,     href: "/reports", onClick: undefined,                   color: "bg-amber-50 text-amber-600" },
          ].map((qa) =>
            qa.href ? (
              <Link key={qa.label} href={qa.href} className="quick-action">
                <div className={`quick-action-icon ${qa.color}`}><qa.icon className="w-5 h-5" /></div>
                <span>{qa.label}</span>
              </Link>
            ) : (
              <button key={qa.label} onClick={qa.onClick} className="quick-action">
                <div className={`quick-action-icon ${qa.color}`}><qa.icon className="w-5 h-5" /></div>
                <span>{qa.label}</span>
              </button>
            )
          )}
        </div>
      )}

      {/* ── Pending Approvals + Recent Orders ──────── */}
      <div className={`grid grid-cols-1 ${canApprove ? "lg:grid-cols-2" : ""} gap-4`} style={{ animation: "staggerFadeUp 0.5s 0.4s both" }}>

        {/* Pending Approvals */}
        {canApprove && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900">Pending Approvals</h2>
                {requests.length > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5 font-semibold">{requests.length} request{requests.length !== 1 ? "s" : ""} waiting</p>
                )}
              </div>
              <Link href="/requests?status=PENDING" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {requests.length === 0 ? (
              <div className="px-5 py-8"><EmptyState variant="pending-approvals" /></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {requests.slice(0, 6).map((req: {
                  id: string; requestNumber: string; requestType: string;
                  estimatedAmount: number; createdAt: string; description: string;
                  order: { orderNumber: string; id: string };
                  requestedBy: { name: string };
                }) => (
                  <div key={req.id} className="overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewId(req.id)}
                            className="font-mono text-xs font-bold text-blue-600 hover:underline text-left"
                          >
                            {req.requestNumber}
                          </button>
                          <StatusBadge status={req.requestType} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {req.order.orderNumber} · {req.requestedBy.name} · {formatDate(req.createdAt)}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                        {formatCurrency(req.estimatedAmount)}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {approvedIds.has(req.id) ? (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Done
                          </span>
                        ) : (
                          <>
                            <button onClick={() => approveMutation.mutate(req.id)} disabled={approveMutation.isPending && approveMutation.variables === req.id} className="btn-approve">
                              {approveMutation.isPending && approveMutation.variables === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Approve
                            </button>
                            <button onClick={() => setRejectOpenId(rejectOpenId === req.id ? null : req.id)} className="btn-reject">
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {rejectOpenId === req.id && (
                      <div className="reject-inline px-5 pb-4 pt-3 bg-red-50 border-t border-red-100">
                        <p className="text-xs text-red-700 font-semibold mb-2">Reason for rejection:</p>
                        <textarea
                          className="form-input text-sm resize-none"
                          rows={2}
                          placeholder="Explain why this request is being rejected..."
                          value={rejectNote[req.id] || ""}
                          onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => rejectMutation.mutate({ id: req.id, note: rejectNote[req.id] || "" })} disabled={rejectMutation.isPending || !(rejectNote[req.id]?.trim())} className="btn-danger text-xs py-1.5 px-3">
                            {rejectMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Confirm Reject
                          </button>
                          <button onClick={() => setRejectOpenId(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
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
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-8"><EmptyState variant="orders" ctaLabel="Create First Order" ctaHref="/orders/new" /></div>
          ) : (
            <div className="divide-y divide-slate-50">
              {orders.slice(0, 6).map((order: {
                id: string; orderNumber: string; status: string; orderValue: number;
                estimatedCost: number; invoicedCost: number;
                buyer: { name: string };
              }) => {
                const pct = order.estimatedCost > 0 ? Math.round((order.invoicedCost / order.estimatedCost) * 100) : 0;
                const isOver = order.invoicedCost > order.estimatedCost;
                const barColor = isOver ? "cost-bar-red" : pct > 90 ? "cost-bar-yellow" : "cost-bar-green";
                return (
                  <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOver ? "bg-red-50" : "bg-blue-50"}`}>
                      <Package className={`w-4 h-4 ${isOver ? "text-red-500" : "text-blue-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-blue-600">{order.orderNumber}</span>
                          <span className="text-xs text-slate-400 truncate">{order.buyer.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={order.status} />
                          <span className={`text-xs font-bold tabular-nums ${isOver ? "text-red-500" : "text-slate-500"}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="cost-bar-wrap" style={{ height: 4 }}>
                        <div className={`cost-bar-fill ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────── */}
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

      {/* PO Preview + Approve/Reject from dashboard */}
      <POReviewModal
        requestId={previewId}
        onClose={() => setPreviewId(null)}
        canApprove={canApprove}
        onApproved={() => qc.invalidateQueries({ queryKey: ["dashboard"] })}
      />
    </div>
  );
}
