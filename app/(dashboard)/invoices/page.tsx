"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [paymentStatus, setPaymentStatus] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", paymentStatus, invoiceType, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(paymentStatus && { paymentStatus }), ...(invoiceType && { invoiceType }) });
      return fetch(`/api/invoices?${params}`).then((r) => r.json());
    },
  });

  const invoices = data?.data?.invoices || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;
  const canPay = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500 text-sm">{total} invoices</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Payments</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
        </select>
        <select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setPage(1); }} className="form-input w-44">
          <option value="">All Types</option>
          <option value="PROVISIONAL">Provisional</option>
          <option value="TAX">Tax Invoice</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Invoice No.</th><th>Order</th><th>Vendor</th><th>Type</th><th>Amount</th><th>GST</th><th>Total</th><th>Paid</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(11)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 animate-pulse rounded w-20" /></td>)}</tr>)
              ) : invoices.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-slate-400">No invoices found</td></tr>
              ) : (
                invoices.map((inv: {
                  id: string; invoiceNumber: string; invoiceType: string; amount: number; gstAmount: number;
                  totalAmount: number; paidAmount: number; paymentStatus: string; invoiceDate: string;
                  invoiceFilePath: string | null; paymentProofPath: string | null;
                  vendor: { name: string }; request: { order: { id: string; orderNumber: string } };
                }) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td>
                      <Link href={`/orders/${inv.request.order.id}`} className="text-blue-600 hover:underline text-sm">{inv.request.order.orderNumber}</Link>
                    </td>
                    <td className="text-slate-700">{inv.vendor.name}</td>
                    <td><StatusBadge status={inv.invoiceType} /></td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td>{formatCurrency(inv.gstAmount)}</td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td>{formatCurrency(inv.paidAmount)}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                    <td className="text-xs text-slate-500">{formatDate(inv.invoiceDate)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {inv.invoiceFilePath && (
                          <a href={`/api/files/${inv.invoiceFilePath}`} target="_blank" className="text-xs text-blue-600 hover:underline">Invoice</a>
                        )}
                        {inv.paymentStatus !== "PAID" && canPay && (
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-slate-600">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
