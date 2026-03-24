"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { DollarSign, Trash2 } from "lucide-react";
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
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500 text-sm">Invoice payment tracking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-amber-500" /> Pending Payments</div>
          <div className="kpi-value text-amber-600 text-xl">{formatCurrency(totalPending)}</div>
          <div className="kpi-sub">{unpaid.length} invoices outstanding</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500" /> Total Paid</div>
          <div className="kpi-value text-green-600 text-xl">{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">{paid.length} invoices settled</div>
        </div>
      </div>

      {/* Pending */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Outstanding Invoices</h2>
        {unpaid.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">All invoices are settled ✓</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Invoice No.</th><th>Order</th><th>Vendor</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {unpaid.map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td><Link href={`/orders/${inv.request.order.id}`} className="text-blue-600 hover:underline text-sm">{inv.request.order.orderNumber}</Link></td>
                    <td>{inv.vendor.name}</td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td>{formatCurrency(inv.paidAmount)}</td>
                    <td className="font-semibold text-amber-600">{formatCurrency(inv.totalAmount - inv.paidAmount)}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/invoices/${inv.id}/payment`} className="btn-primary text-xs px-3 py-1.5">
                          Mark Paid
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmId(inv.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paid History */}
      {paid.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Payment History</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Invoice No.</th><th>Order</th><th>Vendor</th><th>Amount</th><th>Paid On</th><th>Status</th>{isAdmin && <th></th>}</tr>
              </thead>
              <tbody>
                {paid.slice(0, 20).map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td><Link href={`/orders/${inv.request.order.id}`} className="text-blue-600 hover:underline text-sm">{inv.request.order.orderNumber}</Link></td>
                    <td>{inv.vendor.name}</td>
                    <td className="font-semibold">{formatCurrency(inv.paidAmount)}</td>
                    <td className="text-sm text-slate-500">{inv.paidAt ? formatDate(inv.paidAt) : "—"}</td>
                    <td><StatusBadge status="PAID" /></td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => setDeleteConfirmId(inv.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Invoice?</h3>
                <p className="text-sm text-slate-500">This will permanently delete this invoice and its payment records.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
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
