"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetch(`/api/vendors/${vendorId}`).then((r) => r.json()),
  });

  const vendor = data?.data;

  if (isLoading) return <div className="p-6"><div className="h-40 bg-slate-100 animate-pulse rounded-xl" /></div>;
  if (!vendor) return <div className="p-6 text-center text-slate-500">Vendor not found</div>;

  const totalInvoiced = vendor.invoices.reduce((s: number, i: { totalAmount: number }) => s + i.totalAmount, 0);
  const totalPaid = vendor.invoices.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
          <p className="text-slate-500 text-sm">{vendor.invoices.length} invoices &bull; Total: {formatCurrency(totalInvoiced)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <div className="kpi-label">Total Invoiced</div>
          <div className="kpi-value text-xl">{formatCurrency(totalInvoiced)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Paid</div>
          <div className="kpi-value text-xl text-green-700">{formatCurrency(totalPaid)}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-slate-900">Contact Details</h2>
          <dl className="space-y-2">
            {[
              ["Email", vendor.email || "—"],
              ["Phone", vendor.phone || "—"],
              ["GSTIN", vendor.gstin || "—"],
              ["Address", vendor.address || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="text-sm text-slate-500 w-16 flex-shrink-0">{label}</dt>
                <dd className="text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Invoices ({vendor.invoices.length})</h2>
        {vendor.invoices.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No invoices yet</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Invoice No.</th><th>Order</th><th>Type</th><th>Total</th><th>Paid</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {vendor.invoices.map((inv: {
                  id: string; invoiceNumber: string; invoiceType: string; totalAmount: number;
                  paidAmount: number; paymentStatus: string; invoiceDate: string;
                  request: { order: { id: string; orderNumber: string } };
                }) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td><Link href={`/orders/${inv.request.order.id}`} className="text-blue-600 hover:underline text-sm">{inv.request.order.orderNumber}</Link></td>
                    <td><StatusBadge status={inv.invoiceType} /></td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td>{formatCurrency(inv.paidAmount)}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                    <td className="text-xs text-slate-500">{formatDate(inv.invoiceDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
