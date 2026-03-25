"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ArrowLeft, Printer, Paperclip, ExternalLink,
  Calendar, User, Package, FileText, Pencil, Plus, Trash2, Loader2, X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const UNITS = ["pcs", "kg", "m", "m²", "L", "box", "roll", "set", "lot", "hr", "day"];

interface POItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

interface PODetail {
  id: string;
  requestNumber: string;
  requestType: string;
  description: string;
  estimatedAmount: number;
  notes: string | null;
  attachmentUrl: string | null;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  order: { id: string; orderNumber: string; status: string; buyer: { name: string } };
  orderItem: { id: string; itemName: string } | null;
  requestedBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
  items: POItem[];
}

interface EditItem { id: number; description: string; qty: string; unit: string; rate: string; }

function emptyEditItem(): EditItem {
  return { id: Date.now() + Math.random(), description: "", qty: "1", unit: "pcs", rate: "" };
}

export default function PODetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([emptyEditItem()]);
  const [editNotes, setEditNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => fetch(`/api/requests/${requestId}`).then((r) => r.json()),
  });

  // Company settings for the letterhead
  const { data: companyData } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => fetch("/api/settings/company").then((r) => r.json()),
  });
  const company = companyData?.data;

  const po: PODetail | null = data?.data || null;

  const openEdit = () => {
    if (!po) return;
    setEditItems(
      po.items.length > 0
        ? po.items.map((i) => ({ id: Math.random(), description: i.description, qty: String(i.qty), unit: i.unit, rate: String(i.rate) }))
        : [{ id: Math.random(), description: po.description, qty: "1", unit: "pcs", rate: String(po.estimatedAmount) }]
    );
    setEditNotes(po.notes || "");
    setEditOpen(true);
  };

  const updateEditItem = (id: number, field: keyof EditItem, value: string) =>
    setEditItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  const removeEditItem = (id: number) =>
    setEditItems((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev);

  const editMutation = useMutation({
    mutationFn: async () => {
      const valid = editItems.filter((i) => i.description.trim() && Number(i.qty) > 0);
      if (valid.length === 0) { toast.error("Add at least one valid item"); return null; }
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editNotes.trim() || null,
          items: valid.map((i) => ({ description: i.description.trim(), qty: Number(i.qty), unit: i.unit, rate: Number(i.rate) || 0 })),
        }),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (!res) return;
      if (res.success) {
        toast.success("Purchase order updated");
        setEditOpen(false);
        qc.invalidateQueries({ queryKey: ["request", requestId] });
      } else {
        toast.error(res.error || "Failed to update");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80 }} />
        ))}
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="card text-center py-16 text-slate-400">Purchase order not found.</div>
      </div>
    );
  }

  const grandTotal = po.items.length > 0
    ? po.items.reduce((s, i) => s + i.amount, 0)
    : po.estimatedAmount;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #po-printable, #po-printable * { visibility: visible !important; }
          #po-printable { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 no-print">
          <Link href="/requests" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Purchase Order</h1>
            <p className="text-slate-400 text-sm font-mono">{po.requestNumber}</p>
          </div>
          <StatusBadge status={po.status} />
          {po.status === "PENDING" && (
            <button onClick={openEdit} className="btn-secondary gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
          <button onClick={() => window.print()} className="btn-primary gap-2">
            <Printer className="w-4 h-4" /> Export PDF
          </button>
        </div>

        {/* PO Document */}
        <div id="po-printable" className="space-y-5">

          {/* PO Header */}
          <div className="card">
            {/* Letterhead */}
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {company?.companyName ? company.companyName : <>Order to <span className="text-emerald-600">Profit</span></>}
                </h2>
                {company?.gstin   && <p className="text-slate-500 text-xs mt-0.5">GSTIN: {company.gstin}</p>}
                {company?.address && <p className="text-slate-400 text-xs mt-0.5">{company.address}</p>}
                {(company?.phone || company?.email) && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    {[company.phone, company.email].filter(Boolean).join(" · ")}
                  </p>
                )}
                {!company?.companyName && <p className="text-slate-400 text-xs mt-1">Purchase Order Management System</p>}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700 font-mono">{po.requestNumber}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    po.status === "APPROVED" ? "bg-emerald-100 text-emerald-700"
                    : po.status === "REJECTED" ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                  }`}>
                    {po.status}
                  </span>
                </div>
              </div>
            </div>

            {/* PO Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Calendar className="w-3 h-3" /> Date Raised
                </div>
                <div className="font-semibold text-slate-900">{formatDate(po.createdAt)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <User className="w-3 h-3" /> Raised By
                </div>
                <div className="font-semibold text-slate-900">{po.requestedBy.name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Package className="w-3 h-3" /> Linked Order
                </div>
                <Link href={`/orders/${po.order.id}`} className="font-semibold text-blue-600 hover:underline font-mono text-xs no-print">
                  {po.order.orderNumber}
                </Link>
                <div className="font-semibold text-blue-700 font-mono text-xs hidden print:block">
                  {po.order.orderNumber}
                </div>
                <div className="text-xs text-slate-400">{po.order.buyer.name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <FileText className="w-3 h-3" /> PO Type
                </div>
                <div className="font-semibold text-slate-900">{po.requestType}</div>
                {po.orderItem && (
                  <div className="text-xs text-slate-400">{po.orderItem.itemName}</div>
                )}
              </div>
            </div>

            {/* Approved by */}
            {po.approvedBy && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Approved By</div>
                  <div className="font-semibold text-emerald-700">{po.approvedBy.name}</div>
                </div>
                {po.approvedAt && (
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Approved On</div>
                    <div className="font-semibold text-slate-900">{formatDate(po.approvedAt)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Rejected note */}
            {po.status === "REJECTED" && po.rejectionNote && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
                <span className="font-semibold">Rejection Reason: </span>{po.rejectionNote}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="card p-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-20">Qty</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-16">Unit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-28">Rate</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.length > 0 ? (
                    po.items.map((item, i) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-800">{item.description}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.qty}</td>
                        <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    // Legacy single-item PO (old format)
                    <tr className="border-b border-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-400">1</td>
                      <td className="px-4 py-3 text-slate-800">{po.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">—</td>
                      <td className="px-4 py-3 text-slate-500">—</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">—</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{formatCurrency(po.estimatedAmount)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-700 text-sm">
                      TOTAL ESTIMATED AMOUNT
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 tabular-nums text-lg">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes & Attachment */}
          {(po.notes || po.attachmentUrl) && (
            <div className="card space-y-4">
              {po.notes && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes / Terms</div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{po.notes}</p>
                </div>
              )}
              {po.attachmentUrl && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Attachment</div>
                  <a
                    href={po.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium no-print"
                  >
                    <Paperclip className="w-4 h-4" />
                    View attached document
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-sm text-blue-600 hidden print:block">
                    Attachment: {po.attachmentUrl}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer (print) */}
          <div className="hidden print:block mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-8 text-xs text-slate-500">
              <div>
                <div className="border-t border-slate-400 pt-2 mt-8">Raised By: {po.requestedBy.name}</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2 mt-8">
                  {po.approvedBy ? `Approved By: ${po.approvedBy.name}` : "Approved By: _____________"}
                </div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2 mt-8">Authorized Signatory</div>
              </div>
            </div>
            <div className="text-center text-xs text-slate-300 mt-6">
              {company?.companyName ? company.companyName : "Order to Profit"} • {new Date().toLocaleDateString()}
            </div>
          </div>

        </div>

        {/* Bottom actions (no-print) */}
        <div className="flex gap-3 no-print">
          <Link href="/requests" className="btn-secondary py-2.5 px-5">
            ← Back to Requests
          </Link>
          {po.status === "PENDING" && (
            <button onClick={openEdit} className="btn-secondary gap-2 py-2.5 px-5">
              <Pencil className="w-4 h-4" /> Edit PO
            </button>
          )}
          <button onClick={() => window.print()} className="btn-primary gap-2 py-2.5 px-5">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── Edit PO Modal ─────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">Edit Purchase Order</h3>
                <p className="text-xs text-slate-400 font-mono">{po.requestNumber}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Line items */}
              <div className="card p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h4 className="font-semibold text-slate-900 text-sm">Line Items</h4>
                  <button type="button" onClick={() => setEditItems((p) => [...p, emptyEditItem()])} className="btn-secondary text-xs py-1.5 px-3">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 500 }}>
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Description</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 w-20">Qty</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-20">Unit</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 w-28">Rate (₹)</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50">
                          <td className="px-2 py-2">
                            <input type="text" value={item.description} onChange={(e) => updateEditItem(item.id, "description", e.target.value)} placeholder="Item description..." className="form-input text-sm py-1.5" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={item.qty} onChange={(e) => updateEditItem(item.id, "qty", e.target.value)} className="form-input text-sm py-1.5 text-right" />
                          </td>
                          <td className="px-2 py-2">
                            <select value={item.unit} onChange={(e) => updateEditItem(item.id, "unit", e.target.value)} className="form-input text-sm py-1.5">
                              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={item.rate} onChange={(e) => updateEditItem(item.id, "rate", e.target.value)} placeholder="0.00" className="form-input text-sm py-1.5 text-right" />
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeEditItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes / Terms <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="form-input resize-none" rows={2} placeholder="Delivery instructions, payment terms..." />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditOpen(false)} className="btn-secondary px-5">Cancel</button>
              <button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="btn-primary flex-1 justify-center">
                {editMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
