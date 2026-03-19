"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { VendorForm } from "@/components/forms/VendorForm";
import { ArrowLeft, Loader2, Upload, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";

interface VendorOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function ProcurementPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showVendorSheet, setShowVendorSheet] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    invoiceType: "PROVISIONAL",
    description: "",
    qty: "",
    rate: "",
    gstAmount: "0",
  });

  const { data: requestData, isLoading } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => fetch(`/api/invoices?requestId=${requestId}&limit=50`).then((r) => r.json()),
  });

  const { data: reqDetail } = useQuery({
    queryKey: ["request-detail", requestId],
    queryFn: () => fetch(`/api/requests?limit=1`).then((r) => r.json()),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors-minimal"],
    queryFn: () => fetch("/api/vendors?minimal=true").then((r) => r.json()),
  });

  const vendors: VendorOption[] = vendorsData?.data || [];
  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const invoices = requestData?.data?.invoices || [];
  const amount = (Number(formData.qty) || 0) * (Number(formData.rate) || 0);
  const gst = Number(formData.gstAmount) || 0;
  const totalAmount = amount + gst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) { toast.error("Please select a vendor"); return; }
    if (!formData.invoiceNumber || !formData.invoiceDate) { toast.error("Invoice number and date are required"); return; }
    if (!formData.qty || !formData.rate) { toast.error("Qty and rate are required"); return; }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("requestId", requestId);
      fd.append("vendorId", selectedVendor.id);
      fd.append("vendorName", selectedVendor.name);
      fd.append("invoiceNumber", formData.invoiceNumber);
      fd.append("invoiceDate", formData.invoiceDate);
      fd.append("invoiceType", formData.invoiceType);
      fd.append("description", formData.description);
      fd.append("qty", formData.qty);
      fd.append("rate", formData.rate);
      fd.append("amount", String(amount));
      fd.append("gstAmount", formData.gstAmount);
      fd.append("totalAmount", String(totalAmount));
      if (invoiceFile) fd.append("invoiceFile", invoiceFile);

      const res = await fetch("/api/invoices", { method: "POST", body: fd });
      const json = await res.json();

      if (json.success) {
        toast.success("Invoice added successfully");
        qc.invalidateQueries({ queryKey: ["request", requestId] });
        setShowForm(false);
        setFormData({ invoiceNumber: "", invoiceDate: "", invoiceType: "PROVISIONAL", description: "", qty: "", rate: "", gstAmount: "0" });
        setInvoiceFile(null);
        setSelectedVendor(null);
      } else {
        toast.error(json.error || "Failed to add invoice");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6"><div className="h-32 bg-slate-100 animate-pulse rounded-xl" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Invoice</h1>
          <p className="text-slate-500 text-sm">Request #{requestId.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Existing invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Invoices for this Request ({invoices.length})</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            {showForm ? "Cancel" : "+ Add Invoice"}
          </button>
        </div>

        {invoices.length === 0 && !showForm ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-sm">No invoices yet. Add the first one.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Invoice No.</th><th>Vendor</th><th>Type</th><th>Amount</th><th>GST</th><th>Total</th><th>Pay Status</th><th>Files</th></tr>
              </thead>
              <tbody>
                {invoices.map((inv: { id: string; invoiceNumber: string; invoiceType: string; amount: number; gstAmount: number; totalAmount: number; paymentStatus: string; paidAmount: number; invoiceFilePath: string | null; paymentProofPath: string | null; vendor: { name: string }; invoiceDate: string }) => (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></td>
                    <td>{inv.vendor.name}</td>
                    <td><StatusBadge status={inv.invoiceType} /></td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td>{formatCurrency(inv.gstAmount)}</td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                    <td>
                      <div className="flex gap-2">
                        {inv.invoiceFilePath && (
                          <a href={`/api/files/${inv.invoiceFilePath}`} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">Invoice</a>
                        )}
                        {inv.paymentProofPath && (
                          <a href={`/api/files/${inv.paymentProofPath}`} target="_blank" rel="noopener" className="text-xs text-green-600 hover:underline">Proof</a>
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

      {/* Add Invoice Form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-5">New Invoice</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Vendor */}
            <div>
              <label className="form-label">Vendor *</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <button type="button" onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                    className="form-input text-left flex items-center justify-between w-full">
                    <span className={selectedVendor ? "text-slate-900" : "text-slate-400"}>
                      {selectedVendor?.name || "Select vendor..."}
                    </span>
                    {vendorDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {vendorDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <div className="p-2 border-b border-slate-100">
                        <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="form-input text-sm" placeholder="Search vendors..." autoFocus />
                      </div>
                      {filteredVendors.map((v) => (
                        <button key={v.id} type="button" onClick={() => { setSelectedVendor(v); setVendorDropdownOpen(false); setVendorSearch(""); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50">
                          <div className="font-medium">{v.name}</div>
                          {v.phone && <div className="text-xs text-slate-400">{v.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowVendorSheet(true)} className="btn-secondary text-sm whitespace-nowrap">+ New Vendor</button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="form-label">Invoice Number *</label>
                <input value={formData.invoiceNumber} onChange={(e) => setFormData((p) => ({ ...p, invoiceNumber: e.target.value }))} className="form-input" placeholder="INV-2025-001" />
              </div>
              <div>
                <label className="form-label">Invoice Date *</label>
                <input type="date" value={formData.invoiceDate} onChange={(e) => setFormData((p) => ({ ...p, invoiceDate: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Invoice Type</label>
                <select value={formData.invoiceType} onChange={(e) => setFormData((p) => ({ ...p, invoiceType: e.target.value }))} className="form-input">
                  <option value="PROVISIONAL">Provisional</option>
                  <option value="TAX">Tax Invoice</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="form-input resize-none" rows={2} placeholder="What was purchased..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="form-label">Qty *</label>
                <input type="number" step="0.01" value={formData.qty} onChange={(e) => setFormData((p) => ({ ...p, qty: e.target.value }))} className="form-input" placeholder="0" />
              </div>
              <div>
                <label className="form-label">Rate (₹) *</label>
                <input type="number" step="0.01" value={formData.rate} onChange={(e) => setFormData((p) => ({ ...p, rate: e.target.value }))} className="form-input" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Amount</label>
                <div className="form-input bg-slate-50 cursor-default">{formatCurrency(amount)}</div>
              </div>
              <div>
                <label className="form-label">GST Amount</label>
                <input type="number" step="0.01" value={formData.gstAmount} onChange={(e) => setFormData((p) => ({ ...p, gstAmount: e.target.value }))} className="form-input" placeholder="0.00" />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Amount</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
            </div>

            {/* File upload */}
            <div>
              <label className="form-label">Invoice File (PDF/JPG/PNG, max 10MB)</label>
              <div className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${invoiceFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                {invoiceFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{invoiceFile.name}</span>
                    <button type="button" onClick={() => setInvoiceFile(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className={invoiceFile ? "hidden" : "absolute inset-0 opacity-0 cursor-pointer"}
                  style={invoiceFile ? { display: "none" } : { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Invoice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor Sheet */}
      {showVendorSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVendorSheet(false)} />
          <div className="relative z-50 w-full sm:w-96 sm:h-screen bg-white shadow-2xl overflow-y-auto">
            <VendorForm
              onSuccess={(vendor) => {
                setSelectedVendor(vendor);
                setShowVendorSheet(false);
                qc.invalidateQueries({ queryKey: ["vendors-minimal"] });
              }}
              onClose={() => setShowVendorSheet(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
