"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Filter, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const qc = useQueryClient();

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

  const totalAmount = invoices.reduce((s: number, i: { totalAmount: number }) => s + i.totalAmount, 0);
  const totalPaid = invoices.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0);
  const totalDue = totalAmount - totalPaid;

  return (
    <div className="p-4 lg:p-5 space-y-0" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* Excel Toolbar */}
      <div className="xls-toolbar">
        <div className="xls-toolbar-title">
          <span className="xls-toolbar-icon">XL</span>
          <span>Invoices.xlsx</span>
          <span className="text-slate-400 font-normal text-xs ml-1">— {total} rows</span>
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="xls-toolbar-btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            <option value="">All Payments</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        <select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value); setPage(1); }}
          className="xls-toolbar-btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
          <option value="">All Types</option>
          <option value="PROVISIONAL">Provisional</option>
          <option value="TAX">Tax Invoice</option>
          <option value="OTHER">Other</option>
        </select>

        <button onClick={() => qc.invalidateQueries({ queryKey: ["invoices"] })} className="xls-toolbar-btn" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Spreadsheet Table */}
      <div className="xls-wrap">
        <table className="xls-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Invoice No.</th>
              <th>Order</th>
              <th>Vendor</th>
              <th>Type</th>
              <th>Amount</th>
              <th>GST</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(13)].map((_, j) => (
                  <td key={j}><div className="h-3 bg-slate-100 animate-pulse rounded w-14" /></td>
                ))}</tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={13} className="py-12 text-center text-slate-400">No invoices found</td></tr>
            ) : (
              <>
                {invoices.map((inv: {
                  id: string; invoiceNumber: string; invoiceType: string; amount: number; gstAmount: number;
                  totalAmount: number; paidAmount: number; paymentStatus: string; invoiceDate: string;
                  invoiceFilePath: string | null; paymentProofPath: string | null;
                  vendor: { name: string }; request: { order: { id: string; orderNumber: string } };
                }, idx: number) => {
                  const due = inv.totalAmount - (inv.paidAmount ?? 0);
                  return (
                    <tr key={inv.id}>
                      <td>{(page - 1) * limit + idx + 1}</td>
                      <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                      <td>
                        <Link href={`/orders/${inv.request.order.id}`} className="text-xs hover:underline" style={{ color: "#217346" }}>
                          {inv.request.order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-sm">{inv.vendor.name}</td>
                      <td><StatusBadge status={inv.invoiceType} /></td>
                      <td className="xls-num">{formatCurrency(inv.amount)}</td>
                      <td className="xls-num text-slate-500">{formatCurrency(inv.gstAmount)}</td>
                      <td className="xls-num font-semibold">{formatCurrency(inv.totalAmount)}</td>
                      <td className="xls-num text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                      <td className={`xls-num ${due > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                        {formatCurrency(due)}
                      </td>
                      <td><StatusBadge status={inv.paymentStatus} /></td>
                      <td className="text-xs text-slate-500">{formatDate(inv.invoiceDate)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {inv.invoiceFilePath && (
                            <a href={`/api/files/${inv.invoiceFilePath}`} target="_blank" className="text-xs hover:underline" style={{ color: "#217346" }}>
                              View
                            </a>
                          )}
                          {inv.paymentStatus !== "PAID" && canPay && (
                            <Link href={`/invoices/${inv.id}/payment`} className="text-xs hover:underline font-medium" style={{ color: "#217346" }}>
                              Pay
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length < 5 && [...Array(5 - invoices.length)].map((_, i) => (
                  <tr key={`empty-${i}`} className="xls-empty">
                    {[...Array(13)].map((_, j) => (
                      <td key={j}>{j === 0 ? invoices.length + i + 1 : ""}</td>
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
          <span className="xls-sheet-tab">Invoices</span>
          <span className="text-white/60">Sheet1</span>
        </div>
        <div className="flex items-center gap-4">
          {invoices.length > 0 && (
            <>
              <span>Total: {formatCurrency(totalAmount)}</span>
              <span>Paid: {formatCurrency(totalPaid)}</span>
              <span>Due: {formatCurrency(totalDue)}</span>
            </>
          )}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">‹</button>
              <span>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">›</button>
            </div>
          )}
          <span className="text-white/60">Count: {total}</span>
        </div>
      </div>
    </div>
  );
}
