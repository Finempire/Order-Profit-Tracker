"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RejectModal } from "@/components/shared/RejectModal";
import { ArrowLeft, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { JobCostTab } from "@/components/order/JobCostTab";

const TABS = ["Overview", "Cost Breakdown", "Job Cost Sheet", "Requests", "Invoices"] as const;
type Tab = (typeof TABS)[number];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; number: string } | null>(null);

  const canApprove = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const canViewCost = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetch(`/api/orders/${orderId}`).then((r) => r.json()),
  });

  const { data: costData } = useQuery({
    queryKey: ["order-cost", orderId],
    queryFn: () => fetch(`/api/orders/${orderId}/cost-summary`).then((r) => r.json()),
    enabled: canViewCost,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/requests/${id}/approve`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) { toast.success("Request approved"); qc.invalidateQueries({ queryKey: ["order", orderId] }); }
      else toast.error(res.error);
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
      if (res.success) { toast.success("Request rejected"); qc.invalidateQueries({ queryKey: ["order", orderId] }); setRejectOpen(false); }
      else toast.error(res.error);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <div className="skeleton skeleton-title w-40" />
            <div className="skeleton skeleton-text w-28" />
          </div>
        </div>
        <div className="flex gap-1 border-b border-slate-200">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-text w-24 mx-2 mb-2" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-kpi" />)}
        </div>
      </div>
    );
  }

  const order = orderData?.data;
  if (!order) {
    return <div className="p-6 text-center text-slate-500">Order not found</div>;
  }

  const cost = costData?.data;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-slate-500 text-sm">{order.buyer.name} &bull; {formatDate(order.orderDate)}</p>
        </div>
        <Link href={`/orders/${orderId}/edit`} className="btn-secondary text-sm">Edit Order</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
        {TABS.filter((t) => (t !== "Cost Breakdown" && t !== "Job Cost Sheet") || canViewCost).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-900">Order Details</h3>
            <dl className="space-y-2">
              {[
                ["Order Number", order.orderNumber],
                ["Order Date", formatDate(order.orderDate)],
                ["Shipping Date", order.shippingDate ? formatDate(order.shippingDate) : "Not set"],
                ["Status", <StatusBadge key="s" status={order.status} />],
                ["Notes", order.notes || "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex gap-4">
                  <dt className="text-sm text-slate-500 w-32 flex-shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-900">Buyer Details</h3>
            <dl className="space-y-2">
              {[
                ["Name", order.buyer.name],
                ["Email", order.buyer.email || "—"],
                ["Phone", order.buyer.phone || "—"],
                ["GSTIN", order.buyer.gstin || "—"],
                ["Address", order.buyer.address || "—"],
                ["Ship To", order.buyer.shippingAddress || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <dt className="text-sm text-slate-500 w-24 flex-shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card md:col-span-2">
            <h3 className="font-semibold text-slate-900 mb-3">Order Items</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Item Name</th><th>Description</th><th>Qty</th>
                    {role !== "PRODUCTION" && <><th>Rate</th><th>Amount</th></>}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: { id: string; itemName: string; description: string | null; qty: number; rate: number; amount: number }, idx: number) => (
                    <tr key={item.id}>
                      <td className="text-slate-400 text-xs">{idx + 1}</td>
                      <td className="font-medium">{item.itemName}</td>
                      <td className="text-slate-500 text-sm">{item.description || "—"}</td>
                      <td>{item.qty}</td>
                      {role !== "PRODUCTION" && (
                        <>
                          <td>{formatCurrency(item.rate)}</td>
                          <td className="font-semibold">{formatCurrency(item.amount)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {role !== "PRODUCTION" && (
                    <tr>
                      <td colSpan={5} className="text-right font-semibold text-slate-700 pr-4">Total</td>
                      <td className="font-bold text-lg">{formatCurrency(order.items.reduce((s: number, i: { amount: number }) => s + i.amount, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Cost Breakdown" && canViewCost && (
        <div className="space-y-5">
          {cost ? (
            <>
              {/* 4-Column Executive Summary */}
              <div className="card">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Cost Health Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Order Value",   value: cost.orderValue,    color: "text-slate-900" },
                    { label: "Est. Cost",      value: cost.estimatedCost, color: "text-slate-900" },
                    { label: "Actual Invoiced",value: cost.invoicedCost,  color: cost.costVariance > 0 ? "text-red-600" : "text-emerald-700" },
                    { label: "Variance",       value: cost.costVariance,  color: cost.costVariance > 0 ? "text-red-600" : "text-emerald-700", isVariance: true },
                  ].map(({ label, value, color, isVariance }) => (
                    <div key={label} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
                      <div className={`text-xl font-bold tabular-nums ${color}`}>
                        {isVariance && value > 0 ? "+" : ""}{formatCurrency(value)}
                      </div>
                      {isVariance && (
                        <div className={`text-xs font-medium mt-0.5 ${cost.costVariance > 0 ? "text-red-500" : "text-emerald-600"}`}>
                          {cost.costVariance > 0 ? "▲" : "▼"} {Math.abs(cost.costVariancePercent).toFixed(1)}%
                          {cost.costVariance > 0 ? " over" : " saved"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Tracker */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Payment Tracker</h3>
                  <span className="text-xs text-slate-400">
                    Paid <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(cost.paidAmount)}</span>
                    {" / "}
                    <span className="tabular-nums">{formatCurrency(cost.invoicedCost)}</span>
                  </span>
                </div>
                <div className="cost-bar-wrap h-3 mb-2">
                  <div
                    className="cost-bar-fill cost-bar-green"
                    style={{ width: cost.invoicedCost > 0 ? `${Math.min((cost.paidAmount / cost.invoicedCost) * 100, 100)}%` : "0%" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="text-emerald-600 font-semibold">Paid: {formatCurrency(cost.paidAmount)}</span>
                  {cost.pendingPayment > 0 && (
                    <span className="text-amber-600 font-semibold">Outstanding: {formatCurrency(cost.pendingPayment)}</span>
                  )}
                </div>
              </div>

              {/* Item-Level Breakdown */}
              <div className="card p-0">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Item-Level Breakdown</h3>
                </div>
                <div className="table-wrapper border-none rounded-none">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Est. Cost</th>
                        <th>Invoiced</th>
                        <th>Paid</th>
                        <th>Variance</th>
                        <th>% Used</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cost.itemBreakdown.map((item: {
                        itemId: string; itemName: string; estimatedCost: number;
                        invoicedCost: number; paidAmount: number; variance: number; variancePct: number;
                      }) => {
                        // % of estimated cost used
                        const pctUsed = item.estimatedCost > 0 ? Math.round((item.invoicedCost / item.estimatedCost) * 100) : 0;
                        const pctColor = pctUsed <= 95 ? "text-emerald-600 bg-emerald-50" : pctUsed <= 105 ? "text-amber-700 bg-amber-50" : "text-red-600 bg-red-50";
                        const isOverrun = item.invoicedCost > item.estimatedCost;
                        const payPct = item.invoicedCost > 0 ? Math.round((item.paidAmount / item.invoicedCost) * 100) : 0;
                        const payStatus = payPct >= 100 ? "Paid" : payPct > 0 ? "Partial" : "Unpaid";
                        const payColor = payPct >= 100 ? "badge badge-paid" : payPct > 0 ? "badge badge-partial" : "badge badge-unpaid";
                        return (
                          <tr key={item.itemId} className={isOverrun ? "row-overrun" : ""}>
                            <td className="font-semibold text-slate-900">{item.itemName}</td>
                            <td className="num">{formatCurrency(item.estimatedCost)}</td>
                            <td className={`num font-semibold ${isOverrun ? "text-red-600" : "text-slate-700"}`}>{formatCurrency(item.invoicedCost)}</td>
                            <td className="num">{formatCurrency(item.paidAmount)}</td>
                            <td className="num">
                              <span className={isOverrun ? "text-red-600 font-semibold" : item.variance < 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                                {item.variance > 0 ? "+" : ""}{formatCurrency(item.variance)}
                              </span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${pctColor}`}>
                                {pctUsed}%
                              </span>
                            </td>
                            <td>
                              <span className={payColor}>{payStatus}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-10 text-slate-400 text-sm">Loading cost data...</div>
          )}
        </div>
      )}

      {activeTab === "Job Cost Sheet" && canViewCost && (
        <JobCostTab
          orderId={orderId}
          orderValue={order.items.reduce((s: number, i: { amount: number }) => s + i.amount, 0)}
        />
      )}

      {activeTab === "Requests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Purchase Requests</h3>
            <Link href={`/requests/new?orderId=${orderId}`} className="btn-primary text-sm">
              Raise Request
            </Link>
          </div>
          {order.requests.length === 0 ? (
            <div className="card text-center py-10 text-slate-400">No purchase requests yet</div>
          ) : (
            <div className="card p-0">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Req No.</th><th>Item</th><th>Type</th><th>Qty</th><th>Rate</th><th>Est. Amount</th><th>Status</th><th>Raised By</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {order.requests.map((req: {
                      id: string; requestNumber: string; requestType: string; qty: number; rate: number;
                      estimatedAmount: number; status: string; rejectionNote: string | null;
                      orderItem: { itemName: string } | null; requestedBy: { name: string };
                    }) => (
                      <tr key={req.id}>
                        <td><span className="font-mono text-xs text-blue-600">{req.requestNumber}</span></td>
                        <td className="text-sm">{req.orderItem?.itemName || "—"}</td>
                        <td><StatusBadge status={req.requestType} /></td>
                        <td>{req.qty}</td>
                        <td>{formatCurrency(req.rate)}</td>
                        <td className="font-medium">{formatCurrency(req.estimatedAmount)}</td>
                        <td>
                          <div title={req.rejectionNote || ""}>
                            <StatusBadge status={req.status} />
                          </div>
                        </td>
                        <td className="text-sm text-slate-600">{req.requestedBy.name}</td>
                        <td>
                          {req.status === "PENDING" && canApprove && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => approveMutation.mutate(req.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><Check className="w-4 h-4" /></button>
                              <button onClick={() => { setRejectTarget({ id: req.id, number: req.requestNumber }); setRejectOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><X className="w-4 h-4" /></button>
                            </div>
                          )}
                          {req.status === "APPROVED" && (
                            <Link href={`/procurement/${req.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Invoice
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Invoices" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Vendor Invoices</h3>
          {order.requests.every((r: { invoices: unknown[] }) => r.invoices.length === 0) ? (
            <div className="card text-center py-10 text-slate-400">No invoices yet</div>
          ) : (
            <div className="card p-0">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Invoice No.</th><th>Vendor</th><th>Type</th><th>Amount</th><th>GST</th><th>Total</th><th>Payment Status</th><th>Paid</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {order.requests.flatMap((r: { invoices: { id: string; invoiceNumber: string; invoiceType: string; amount: number; gstAmount: number; totalAmount: number; paymentStatus: string; paidAmount: number; invoiceFilePath: string | null; vendor: { name: string } }[] }) =>
                      r.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                          <td>{inv.vendor.name}</td>
                          <td><StatusBadge status={inv.invoiceType} /></td>
                          <td>{formatCurrency(inv.amount)}</td>
                          <td>{formatCurrency(inv.gstAmount)}</td>
                          <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                          <td><StatusBadge status={inv.paymentStatus} /></td>
                          <td>{formatCurrency(inv.paidAmount)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {inv.invoiceFilePath && (
                                <a href={`/api/files/${inv.invoiceFilePath}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Invoice</a>
                              )}
                              {inv.paymentStatus !== "PAID" && ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "") && (
                                <Link href={`/invoices/${inv.id}/payment`} className="text-xs text-green-600 hover:underline">Pay</Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
