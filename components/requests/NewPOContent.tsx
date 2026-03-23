"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Plus, Trash2, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Scissors, Wallet, Paperclip, X, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface OrderOption {
  id: string;
  orderNumber: string;
  status: string;
  buyer: { name: string };
  items: { id: string; itemName: string }[];
}

interface LineItem {
  description: string;
  qty: string;
  unit: string;
  rate: string;
}

const UNITS = ["pcs", "kg", "m", "m²", "m³", "L", "box", "roll", "set", "lot", "hr", "day"];

function emptyItem(): LineItem {
  return { description: "", qty: "1", unit: "pcs", rate: "" };
}

interface Props {
  onClose?: () => void;
  onSuccess?: (data: { id: string; number: string }) => void;
}

export function NewPOContent({ onClose, onSuccess }: Props) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [orderItemId, setOrderItemId] = useState("");
  const [requestType, setRequestType] = useState<"MATERIAL" | "EXPENSE">("MATERIAL");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<{ number: string; id: string } | null>(null);

  const { data: ordersData } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => fetch("/api/orders?status=ACTIVE&limit=100").then((r) => r.json()),
  });
  const orders: OrderOption[] = ordersData?.data?.orders || [];
  const filteredOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.buyer.name.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const updateItem = (i: number, field: keyof LineItem, value: string) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const totals = items.map((item) => (Number(item.qty) || 0) * (Number(item.rate) || 0));
  const grandTotal = totals.reduce((s, v) => s + v, 0);

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (res.success) return res.data.url;
      toast.error(res.error || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const createPO = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) { toast.error("Please select an order"); return null; }
      const validItems = items.filter((i) => i.description.trim() && Number(i.qty) > 0 && Number(i.rate) >= 0);
      if (validItems.length === 0) { toast.error("Add at least one valid line item"); return null; }

      let attachmentUrl: string | undefined;
      if (attachFile) {
        const url = await uploadFile(attachFile);
        if (!url) return null;
        attachmentUrl = url;
      }

      return fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          orderItemId: orderItemId || null,
          requestType,
          notes: notes.trim() || undefined,
          attachmentUrl,
          items: validItems.map((i) => ({
            description: i.description.trim(),
            qty: Number(i.qty),
            unit: i.unit,
            rate: Number(i.rate),
          })),
        }),
      }).then((r) => r.json());
    },
    onSuccess: (res) => {
      if (!res) return;
      if (res.success) {
        const result = { number: res.data.requestNumber, id: res.data.id };
        if (onSuccess) {
          onSuccess(result);
        } else {
          setSubmitted(result);
        }
      } else {
        toast.error(res.error || "Failed to raise PO");
      }
    },
  });

  const handleClose = () => { if (onClose) onClose(); };

  const resetForm = () => {
    setSubmitted(null);
    setSelectedOrder(null);
    setOrderItemId("");
    setRequestType("MATERIAL");
    setNotes("");
    setItems([emptyItem()]);
    setAttachFile(null);
  };

  /* ── Success Screen (standalone mode) ── */
  if (submitted && !onSuccess) {
    return (
      <div className="p-6 max-w-sm mx-auto text-center space-y-4 py-10">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Purchase Order Raised!</h2>
        <p className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
          {submitted.number}
        </p>
        <p className="text-slate-500 text-sm">
          Your PO is pending approval. View and export it as PDF below.
        </p>
        <div className="flex flex-col gap-2 w-full">
          <Link href={`/requests/${submitted.id}`} className="btn-primary justify-center w-full py-3">
            <FileText className="w-4 h-4" /> View &amp; Export PDF
          </Link>
          <Link href="/requests" className="btn-secondary justify-center w-full py-2.5">View All Requests</Link>
          <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700 py-2">Raise Another PO</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-5 space-y-4">
      {/* PO Details */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">PO Details</h2>

        {/* Order selector */}
        <div>
          <label className="form-label">Linked Order *</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
              className="form-input text-left flex items-center justify-between w-full"
            >
              <span className={selectedOrder ? "text-slate-900 font-medium" : "text-slate-400"}>
                {selectedOrder ? `${selectedOrder.orderNumber} — ${selectedOrder.buyer.name}` : "Select active order..."}
              </span>
              {orderDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </button>
            {orderDropdownOpen && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                  <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="form-input text-sm" placeholder="Search orders..." autoFocus />
                </div>
                {filteredOrders.length === 0
                  ? <div className="p-4 text-sm text-slate-400 text-center">No active orders found</div>
                  : filteredOrders.map((o) => (
                    <button key={o.id} type="button" onClick={() => { setSelectedOrder(o); setOrderItemId(""); setOrderDropdownOpen(false); setOrderSearch(""); }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors">
                      <div className="font-semibold text-slate-900">{o.orderNumber}</div>
                      <div className="text-xs text-slate-400">{o.buyer.name}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectedOrder && (
            <div>
              <label className="form-label">Related Item <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)} className="form-input">
                <option value="">— Not linked to specific item —</option>
                {(selectedOrder.items ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.itemName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">PO Type *</label>
            <div className="flex gap-3">
              {(["MATERIAL", "EXPENSE"] as const).map((type) => {
                const Icon = type === "MATERIAL" ? Scissors : Wallet;
                const isSelected = requestType === type;
                return (
                  <button key={type} type="button" onClick={() => setRequestType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all ${isSelected ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}>
                    <Icon className="w-4 h-4" />{type === "MATERIAL" ? "Material" : "Expense"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">Notes / Terms <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input resize-none" rows={2} placeholder="Delivery instructions, payment terms..." />
        </div>
      </div>

      {/* Line Items */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Line Items</h2>
          <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5 px-3">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 560 }}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">Description *</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">Qty</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">Unit</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">Rate (₹)</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <input type="text" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description..." className="form-input text-sm py-1.5" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="form-input text-sm py-1.5 text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} className="form-input text-sm py-1.5">
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(i, "rate", e.target.value)} placeholder="0.00" className="form-input text-sm py-1.5 text-right" />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">{formatCurrency(totals[i])}</td>
                  <td className="px-2 py-2">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-700">Total Estimated Amount</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700 tabular-nums text-base">{formatCurrency(grandTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100">
          <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-medium">
            <Plus className="w-4 h-4" /> Add another item
          </button>
        </div>
      </div>

      {/* Attachment */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Attachment <span className="text-slate-400 font-normal normal-case text-xs">(optional)</span></h2>
        {attachFile ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-700 font-medium flex-1 truncate">{attachFile.name}</span>
            <span className="text-xs text-blue-500">{(attachFile.size / 1024).toFixed(0)} KB</span>
            <button type="button" onClick={() => setAttachFile(null)} className="text-blue-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
            <p className="text-sm text-slate-400">Click to attach a file</p>
            <p className="text-xs text-slate-300 mt-0.5">PDF, JPG, PNG, DOC, XLS — max 10MB</p>
          </button>
        )}
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttachFile(f); e.target.value = ""; }} />
      </div>

      {/* Footer */}
      <div className="flex gap-3 pb-2">
        <button type="button" onClick={handleClose} className="btn-secondary py-3 px-6">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createPO.mutate()}
          disabled={createPO.isPending || uploading || !selectedOrder}
          className="btn-primary flex-1 justify-center py-3 text-base"
        >
          {createPO.isPending || uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? "Uploading..." : "Submitting..."}</>
            : "Submit Purchase Order"}
        </button>
      </div>
    </div>
  );
}
