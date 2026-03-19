"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function PaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const router = useRouter();

  const [paidAmount, setPaidAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invData, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetch(`/api/invoices/${invoiceId}`).then((r) => r.json()),
  });

  const invoice = invData?.data;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidAmount || parseFloat(paidAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!paidAt) { toast.error("Payment date is required"); return; }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("paidAmount", paidAmount);
      fd.append("paidAt", paidAt);
      if (proofFile) fd.append("paymentProof", proofFile);

      const res = await fetch(`/api/invoices/${invoiceId}/payment`, { method: "PATCH", body: fd });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || "Payment recorded");
        router.push("/payments");
      } else {
        toast.error(json.error || "Failed to record payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-6"><div className="h-40 bg-slate-100 animate-pulse rounded-xl" /></div>;
  if (!invoice) return <div className="p-6 text-center text-slate-500">Invoice not found</div>;

  const balance = invoice.totalAmount - invoice.paidAmount;

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>
        </div>

        {/* Invoice Summary */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-slate-900">Invoice Summary</h2>
          <dl className="space-y-2">
            {[
              ["Invoice No.", invoice.invoiceNumber],
              ["Vendor", invoice.vendor.name],
              ["Order", invoice.request.order.orderNumber],
              ["Invoice Date", formatDate(invoice.invoiceDate)],
              ["Total Amount", formatCurrency(invoice.totalAmount)],
              ["Already Paid", formatCurrency(invoice.paidAmount)],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex gap-4">
                <dt className="text-sm text-slate-500 w-28 flex-shrink-0">{label}</dt>
                <dd className="text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <dt className="text-sm font-semibold text-slate-700 w-28">Balance Due</dt>
              <dd className="text-sm font-bold text-amber-600">{formatCurrency(balance)}</dd>
            </div>
          </dl>
          <div className="pt-1"><StatusBadge status={invoice.paymentStatus} /></div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="font-semibold text-slate-900">Payment Details</h2>

          <div>
            <label className="form-label">Amount Paid (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="form-input"
              placeholder={formatCurrency(balance).replace("₹", "")}
            />
            <p className="text-xs text-slate-400 mt-1">Balance due: {formatCurrency(balance)}</p>
          </div>

          <div>
            <label className="form-label">Payment Date *</label>
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="form-input" />
          </div>

          <div>
            <label className="form-label">Payment Proof (PDF/JPG/PNG, max 10MB)</label>
            <div className={`relative border-2 border-dashed rounded-lg p-5 text-center ${proofFile ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-slate-300"} transition-colors`}>
              {proofFile ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{proofFile.name}</span>
                  <button type="button" onClick={() => setProofFile(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Upload payment proof (bank receipt, screenshot etc.)</p>
                </>
              )}
              {!proofFile && (
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
