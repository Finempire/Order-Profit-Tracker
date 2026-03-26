"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { DollarSign, Trash2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function PaymentsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const qc = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["payments"],
    queryFn: () => fetch("/api/invoices?limit=100").then((r) => r.json()),
  });

  const allInvoices: {
    id: string; invoiceNumber: string; invoiceType: string; totalAmount: number;
    paidAmount: number; paymentStatus: string; invoiceDate: string; paidAt: string | null;
    vendor: { name: string }; request: { order: { id: string; orderNumber: string } };
  }[] = data?.data?.invoices || [];

  const unpaid = allInvoices.filter((i) => i.paymentStatus !== "PAID");
  const paid = allInvoices.filter((i) => i.paymentStatus === "PAID");

  const totalPending = unpaid.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const totalPaid = paid.reduce((s, i) => s + i.paidAmount, 0);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Invoice deleted");
        qc.invalidateQueries({ queryKey: ["payments"] });
        setDeleteConfirmId(null);
      } else {
        toast.error(res.error || "Failed to delete invoice");
      }
    },
  });

  return (
    <div className="p-4 lg:p-5 space-y-4" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* KPI Grid */}
      <div className="xls-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="xls-kpi-cell">
          <div className="flex items-start justify-between">
            <div>
              <div className="xls-kpi-label">Pending Payments</div>
              <div className="xls-kpi-value text-amber-700">{formatCurrency(totalPending)}</div>
              <div className="xls-kpi-sub">{unpaid.length} invoices outstanding</div>
            </div>
            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="xls-kpi-cell">
          <div className="flex items-start justify-between">
            <div>
              <div className="xls-kpi-label">Total Paid</div>
              <div className="xls-kpi-value text-emerald-700">{formatCurrency(totalPaid)}</div>
              <div className="xls-kpi-sub">{paid.length} invoices settled</div>
            </div>
            <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Invoices */}
      <div>
        <div className="xls-toolbar">
          <div className="xls-toolbar-title">
            <span className="xls-toolbar-icon">XL</span>
            <span>OutstandingInvoices.xlsx</span>
            <span className="text-slate-400 font-normal text-xs ml-1">— {unpaid.length} rows</span>
          </div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ["payments"] })} className="xls-toolbar-btn" title="Refresh">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="xls-wrap">
          {unpaid.length === 0 ? (
            <div className="bg-white p-8 text-center text-slate-400 text-sm">All invoices are settled ✓</div>
          ) : (
            <table className="xls-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No.</th>
                  <th>Order</th>
                  <th>Vendor</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((inv, idx) => (
                  <tr key={inv.id}>
                    <td>{idx + 1}</td>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td>
                      <Link href={`/orders/${inv.request.order.id}`} className="text-xs hover:underline" style={{ color: "#217346" }}>
                        {inv.request.order.orderNumber}
                      </Link>
                    </td>
                    <td>{inv.vendor.name}</td>
                    <td className="xls-num font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td className="xls-num text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                    <td className="xls-num font-semibold text-amber-600">{formatCurrency(inv.totalAmount - inv.paidAmount)}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/invoices/${inv.id}/payment`} className="xls-toolbar-btn xls-toolbar-btn-primary text-xs">
                          Mark Paid
                        </Link>
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirmId(inv.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Delete invoice">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="xls-statusbar">
          <div className="flex items-center gap-2">
            <span className="xls-sheet-tab">Outstanding</span>
          </div>
          <span>Balance: {formatCurrency(totalPending)}</span>
        </div>
      </div>

      {/* Payment History */}
      {paid.length > 0 && (
        <div>
          <div className="xls-toolbar">
            <div className="xls-toolbar-title">
              <span className="xls-toolbar-icon">XL</span>
              <span>PaymentHistory.xlsx</span>
              <span className="text-slate-400 font-normal text-xs ml-1">— {paid.length} rows</span>
            </div>
          </div>
          <div className="xls-wrap">
            <table className="xls-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No.</th>
                  <th>Order</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Paid On</th>
                  <th>Status</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {paid.slice(0, 20).map((inv, idx) => (
                  <tr key={inv.id}>
                    <td>{idx + 1}</td>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td>
                      <Link href={`/orders/${inv.request.order.id}`} className="text-xs hover:underline" style={{ color: "#217346" }}>
                        {inv.request.order.orderNumber}
                      </Link>
                    </td>
                    <td>{inv.vendor.name}</td>
                    <td className="xls-num font-semibold">{formatCurrency(inv.paidAmount)}</td>
                    <td className="text-xs text-slate-500">{inv.paidAt ? formatDate(inv.paidAt) : "—"}</td>
                    <td><StatusBadge status="PAID" /></td>
                    {isAdmin && (
                      <td>
                        <button onClick={() => setDeleteConfirmId(inv.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Delete invoice">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="xls-statusbar">
            <div className="flex items-center gap-2">
              <span className="xls-sheet-tab">History</span>
            </div>
            <span>Total Paid: {formatCurrency(totalPaid)}</span>
          </div>
        </div>
      )}

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
                <h3 className="font-semibold text-slate-900">Delete Invoice?</h3>
                <p className="text-sm text-slate-500">This will permanently delete this invoice and its payment records.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="xls-toolbar-btn px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
