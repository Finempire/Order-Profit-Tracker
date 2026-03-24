"use client";

import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Loader2, ChevronDown,
  CheckCircle2, Scissors, Wallet, Paperclip, X, FileText,
  ShoppingBag, Check, Package,
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
  id: number;
  description: string;
  qty: string;
  unit: string;
  rate: string;
  linkedOrderId: string; // "" means generic (goes to first selected order)
}

const UNITS = ["pcs", "kg", "m", "m²", "m³", "L", "box", "roll", "set", "lot", "hr", "day"];

function emptyItem(linkedOrderId = ""): LineItem {
  return { id: Date.now() + Math.random(), description: "", qty: "1", unit: "pcs", rate: "", linkedOrderId };
}

interface Props {
  onClose?: () => void;
  onSuccess?: (data: { id: string; number: string }) => void;
}

export function NewPOContent({ onClose, onSuccess }: Props) {
  const qc = useQueryClient();

  // Multi-order selection
  const [selectedOrders, setSelectedOrders] = useState<OrderOption[]>([]);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [requestType, setRequestType] = useState<"MATERIAL" | "EXPENSE">("MATERIAL");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<{ number: string; id: string } | null>(null);

  // ── Orders Query ──
  const { data: ordersData } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => fetch("/api/orders?status=ACTIVE&limit=100").then((r) => r.json()),
  });
  const allOrders: OrderOption[] = ordersData?.data?.orders || [];
  const filteredOrders = allOrders.filter(
    (o) =>
      !selectedOrders.find((s) => s.id === o.id) &&
      (o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.buyer.name.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  // ── Order selection toggle ──
  const toggleOrder = (order: OrderOption) => {
    const isSelected = selectedOrders.find((o) => o.id === order.id);
    if (isSelected) {
      setSelectedOrders((prev) => prev.filter((o) => o.id !== order.id));
      // Remove linkage from items that were linked to this order
      setItems((prev) =>
        prev.map((item) =>
          item.linkedOrderId === order.id ? { ...item, linkedOrderId: "" } : item
        )
      );
    } else {
      setSelectedOrders((prev) => [...prev, order]);
      // Auto-import if this is the first order and the form is blank
      if (selectedOrders.length === 0 && items.length === 1 && !items[0].description) {
        const newItems = order.items.map((oi) => ({
          ...emptyItem(order.id),
          description: oi.itemName,
        }));
        if (newItems.length > 0) setItems(newItems);
      }
    }
  };

  // ── Import helpers ──
  const importAllFromOrder = (order: OrderOption) => {
    const newItems = order.items.map((oi) => ({
      ...emptyItem(order.id),
      description: oi.itemName,
    }));
    // Replace empty placeholder row if present, otherwise append
    setItems((prev) => {
      const withoutEmpty = prev.filter((i) => i.description.trim() !== "" || i.linkedOrderId !== "");
      return withoutEmpty.length > 0 ? [...withoutEmpty, ...newItems] : newItems;
    });
  };

  const importSingleItem = (orderId: string, itemName: string) => {
    const newItem = { ...emptyItem(orderId), description: itemName };
    setItems((prev) => {
      if (prev.length === 1 && !prev[0].description) return [newItem];
      return [...prev, newItem];
    });
  };

  // ── Line item handlers ──
  const updateItem = (id: number, field: keyof LineItem, value: string) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      emptyItem(selectedOrders.length === 1 ? selectedOrders[0].id : ""),
    ]);

  const removeItem = (id: number) =>
    setItems((prev) =>
      prev.length > 1
        ? prev.filter((i) => i.id !== id)
        : [emptyItem(selectedOrders.length === 1 ? selectedOrders[0].id : "")]
    );

  // ── Totals ──
  const totals = items.map((item) => (Number(item.qty) || 0) * (Number(item.rate) || 0));
  const grandTotal = useMemo(() => totals.reduce((s, v) => s + v, 0), [totals]);

  // ── File upload ──
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

  // ── Submit: creates one PO per selected order ──
  const createPO = useMutation({
    mutationFn: async () => {
      if (selectedOrders.length === 0) { toast.error("Please select at least one order"); return null; }
      const validItems = items.filter((i) => i.description.trim() && Number(i.qty) > 0 && Number(i.rate) >= 0);
      if (validItems.length === 0) { toast.error("Add at least one valid line item"); return null; }

      let attachmentUrl: string | undefined;
      if (attachFile) {
        const url = await uploadFile(attachFile);
        if (!url) return null;
        attachmentUrl = url;
      }

      if (selectedOrders.length === 1) {
        // Single order — original flow
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: selectedOrders[0].id,
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
        return { multi: false, results: [res] };
      }

      // Multiple orders — create one PO per order
      // Items not linked to a specific order go to the first selected order
      const firstOrderId = selectedOrders[0].id;
      const results = await Promise.all(
        selectedOrders.map(async (order) => {
          const orderItems = validItems.filter(
            (i) => i.linkedOrderId === order.id || (i.linkedOrderId === "" && order.id === firstOrderId)
          );
          if (orderItems.length === 0) return null; // skip orders with no items
          return fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              requestType,
              notes: notes.trim() || undefined,
              attachmentUrl,
              items: orderItems.map((i) => ({
                description: i.description.trim(),
                qty: Number(i.qty),
                unit: i.unit,
                rate: Number(i.rate),
              })),
            }),
          }).then((r) => r.json());
        })
      );
      return { multi: true, results: results.filter(Boolean) };
    },
    onSuccess: (payload) => {
      if (!payload) return;
      const { multi, results } = payload as { multi: boolean; results: { success: boolean; data?: { id: string; requestNumber: string }; error?: string }[] };
      const successful = results.filter((r) => r?.success);
      const failed = results.filter((r) => r && !r.success);

      if (failed.length > 0) {
        failed.forEach((r) => toast.error(r?.error || "Failed to raise PO"));
      }
      if (successful.length === 0) return;

      qc.invalidateQueries({ queryKey: ["requests"] });

      if (!multi && successful.length === 1 && successful[0].data) {
        const result = { number: successful[0].data.requestNumber, id: successful[0].data.id };
        if (onSuccess) { onSuccess(result); }
        else { setSubmitted(result); }
      } else {
        // Multi-order: show toast for each
        successful.forEach((r) => {
          if (r.data) toast.success(`PO ${r.data.requestNumber} raised successfully!`);
        });
        if (onSuccess && successful[0]?.data) {
          onSuccess({ number: successful[0].data.requestNumber, id: successful[0].data.id });
        } else {
          setSubmitted(successful[0]?.data ? { number: successful[0].data.requestNumber, id: successful[0].data.id } : null);
        }
      }
    },
  });

  const resetForm = () => {
    setSubmitted(null);
    setSelectedOrders([]);
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
        <p className="text-slate-500 text-sm">Your PO is pending approval. View and export it as PDF below.</p>
        <div className="flex flex-col gap-2 w-full">
          <Link href={`/requests/${submitted.id}`} className="btn-primary justify-center w-full py-3">
            <FileText className="w-4 h-4" /> View &amp; Export PDF
          </Link>
          <Link href="/requests" className="btn-secondary justify-center w-full py-2.5">View All Purchase Orders</Link>
          <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700 py-2">Raise Another PO</button>
        </div>
      </div>
    );
  }

  const multiOrder = selectedOrders.length > 1;

  return (
    <div className="p-4 lg:p-5 space-y-4">
      {/* PO Details */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">PO Details</h2>

        {/* Multi-Order Selector */}
        <div>
          <label className="form-label">Linked Order(s) *</label>
          <div className="relative">
            {/* Selected order tags + trigger */}
            <div
              className="form-input min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-pointer"
              onClick={() => setOrderDropdownOpen((o) => !o)}
            >
              {selectedOrders.length === 0 ? (
                <span className="text-slate-400 text-sm flex-1">Select active order(s)...</span>
              ) : (
                selectedOrders.map((o) => (
                  <span
                    key={o.id}
                    className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded"
                  >
                    {o.orderNumber}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleOrder(o); }}
                      className="hover:text-blue-200 ml-0.5"
                    >
                      <X className="w-3 h-3" strokeWidth={3} />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className={`ml-auto w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${orderDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {orderDropdownOpen && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {/* Already selected */}
                {selectedOrders.length > 0 && (
                  <div className="p-2 border-b border-slate-100 sticky top-0 bg-white space-y-1">
                    {selectedOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg text-sm">
                        <div>
                          <span className="font-semibold text-blue-800">{o.orderNumber}</span>
                          <span className="text-xs text-blue-500 ml-2">{o.buyer.name}</span>
                        </div>
                        <button type="button" onClick={() => toggleOrder(o)} className="text-blue-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="form-input text-sm"
                    placeholder="Search orders..."
                    autoFocus
                  />
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400 text-center">No active orders found</div>
                ) : (
                  filteredOrders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => { toggleOrder(o); setOrderSearch(""); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{o.orderNumber}</div>
                        <div className="text-xs text-slate-400">{o.buyer.name}</div>
                      </div>
                      <Package className="w-4 h-4 text-slate-300" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {multiOrder && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" />
              {selectedOrders.length} orders selected — a separate PO will be created for each.
            </p>
          )}
        </div>

        {/* PO Type */}
        <div>
          <label className="form-label">PO Type *</label>
          <div className="flex gap-3">
            {(["MATERIAL", "EXPENSE"] as const).map((type) => {
              const Icon = type === "MATERIAL" ? Scissors : Wallet;
              const isSelected = requestType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRequestType(type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all ${isSelected ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <Icon className="w-4 h-4" />{type === "MATERIAL" ? "Material" : "Expense"}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="form-label">Notes / Terms <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input resize-none"
            rows={2}
            placeholder="Delivery instructions, payment terms..."
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Line Items</h2>
          <div className="flex gap-2">
            {selectedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="btn-secondary text-xs py-1.5 px-3 text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Import from Order
              </button>
            )}
            <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: multiOrder ? 680 : 560 }}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">Description *</th>
                {multiOrder && (
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-32">Order</th>
                )}
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">Qty</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 w-20">Unit</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">Rate (₹)</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 w-28">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Item description..."
                      className="form-input text-sm py-1.5"
                    />
                  </td>
                  {multiOrder && (
                    <td className="px-2 py-2">
                      <select
                        value={item.linkedOrderId}
                        onChange={(e) => updateItem(item.id, "linkedOrderId", e.target.value)}
                        className="form-input text-xs py-1.5 font-semibold text-blue-700"
                      >
                        <option value="">— First order —</option>
                        {selectedOrders.map((o) => (
                          <option key={o.id} value={o.id}>{o.orderNumber}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                      className="form-input text-sm py-1.5 text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                      className="form-input text-sm py-1.5"
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                      placeholder="0.00"
                      className="form-input text-sm py-1.5 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">{formatCurrency(totals[i])}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={multiOrder ? 6 : 5} className="px-4 py-3 text-right font-semibold text-slate-700">Total Estimated Amount</td>
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
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">
          Attachment <span className="text-slate-400 font-normal normal-case text-xs">(optional)</span>
        </h2>
        {attachFile ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-700 font-medium flex-1 truncate">{attachFile.name}</span>
            <span className="text-xs text-blue-500">{(attachFile.size / 1024).toFixed(0)} KB</span>
            <button type="button" onClick={() => setAttachFile(null)} className="text-blue-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
            <p className="text-sm text-slate-400">Click to attach a file</p>
            <p className="text-xs text-slate-300 mt-0.5">PDF, JPG, PNG, DOC, XLS — max 10MB</p>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttachFile(f); e.target.value = ""; }}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 pb-2">
        <button type="button" onClick={() => onClose?.()} className="btn-secondary py-3 px-6">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createPO.mutate()}
          disabled={createPO.isPending || uploading || selectedOrders.length === 0}
          className="btn-primary flex-1 justify-center py-3 text-base"
        >
          {createPO.isPending || uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? "Uploading..." : "Submitting..."}</>
          ) : multiOrder ? (
            `Submit ${selectedOrders.length} Purchase Orders`
          ) : (
            "Submit Purchase Order"
          )}
        </button>
      </div>

      {/* Import from Order Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Import Items from Orders</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[55vh] overflow-y-auto space-y-6">
              {selectedOrders.map((order) => (
                <div key={order.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {order.orderNumber} — {order.buyer.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { importAllFromOrder(order); setImportModalOpen(false); }}
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Import All
                    </button>
                  </div>
                  {order.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-1">No items on this order</p>
                  ) : (
                    <div className="space-y-1">
                      {order.items.map((oi) => (
                        <div
                          key={oi.id}
                          onClick={() => { importSingleItem(order.id, oi.itemName); setImportModalOpen(false); }}
                          className="flex items-center justify-between px-3 py-2.5 border border-slate-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer group transition-all"
                        >
                          <span className="text-sm font-medium text-slate-700">{oi.itemName}</span>
                          <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="btn-secondary px-5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
