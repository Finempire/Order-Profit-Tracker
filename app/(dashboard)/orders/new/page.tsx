"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { orderSchema } from "@/lib/validations/order";
import { BuyerForm } from "@/components/forms/BuyerForm";

// Explicit type to avoid Zod v4 coerce.date() returning `unknown` in z.infer
interface OrderFormValues {
  orderNumber: string;
  orderDate: Date;
  shippingDate?: Date | null;
  buyerId: string;
  notes?: string;
  items: { id?: string; itemName: string; description?: string; qty: number; rate: number }[];
}

interface BuyerOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  shippingAddress?: string;
  gstin?: string;
}

function NewOrderContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null);
  const [showBuyerForm, setShowBuyerForm] = useState(false);

  const { data: buyersData } = useQuery({
    queryKey: ["buyers-minimal"],
    queryFn: () => fetch("/api/buyers?minimal=true").then((r) => r.json()),
  });
  const buyers: BuyerOption[] = buyersData?.data || [];
  const filteredBuyers = buyers.filter((b) =>
    b.name.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {
      orderNumber: "",
      orderDate: new Date(),
      items: [{ itemName: "", description: "", qty: 0, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");
  const totalValue = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0), 0);

  const createOrder = useMutation({
    mutationFn: (data: OrderFormValues) =>
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          orderDate: data.orderDate.toISOString(),
          shippingDate: data.shippingDate?.toISOString() || null,
        }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Order ${res.data.orderNumber} created!`);
        qc.invalidateQueries({ queryKey: ["orders"] });
        router.push(`/orders/${res.data.id}`);
      } else {
        toast.error(res.error || "Failed to create order");
      }
    },
  });

  const selectBuyer = (buyer: BuyerOption) => {
    setSelectedBuyer(buyer);
    setValue("buyerId", buyer.id, { shouldValidate: true });
    setBuyerDropdownOpen(false);
    setBuyerSearch("");
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">New Order</h1>
        </div>

        <form onSubmit={handleSubmit((data) => createOrder.mutate(data as OrderFormValues))} className="space-y-6">
          {/* Section 1: Order Header */}
          <div className="card space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Order Information</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="form-label">Order Number *</label>
                <input {...register("orderNumber")} className="form-input" placeholder="ORD-2025-001" />
                {errors.orderNumber && <p className="form-error">{errors.orderNumber.message}</p>}
              </div>
              <div>
                <label className="form-label">Order Date *</label>
                <input
                  type="date"
                  {...register("orderDate", { valueAsDate: true })}
                  className="form-input"
                />
                {errors.orderDate && <p className="form-error">{errors.orderDate.message}</p>}
              </div>
              <div>
                <label className="form-label">Shipping Date</label>
                <input
                  type="date"
                  {...register("shippingDate", { valueAsDate: true })}
                  className="form-input"
                />
              </div>
            </div>

            {/* Buyer Selector */}
            <div>
              <label className="form-label">Buyer *</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="hidden"
                    {...register("buyerId")}
                  />
                  <button
                    type="button"
                    onClick={() => setBuyerDropdownOpen(!buyerDropdownOpen)}
                    className="form-input text-left flex items-center justify-between w-full"
                  >
                    <span className={selectedBuyer ? "text-slate-900" : "text-slate-400"}>
                      {selectedBuyer?.name || "Select a buyer..."}
                    </span>
                    {buyerDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {buyerDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-100">
                        <input
                          value={buyerSearch}
                          onChange={(e) => setBuyerSearch(e.target.value)}
                          className="form-input text-sm"
                          placeholder="Search buyers..."
                          autoFocus
                        />
                      </div>
                      {filteredBuyers.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 text-center">No buyers found</div>
                      ) : (
                        filteredBuyers.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => selectBuyer(b)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                          >
                            <div className="font-medium text-slate-900">{b.name}</div>
                            {b.phone && <div className="text-xs text-slate-400">{b.phone}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyerForm(true)}
                  className="btn-secondary text-sm whitespace-nowrap"
                >
                  + New Buyer
                </button>
              </div>
              {errors.buyerId && <p className="form-error">{errors.buyerId.message}</p>}
            </div>

            {/* Buyer auto-fill */}
            {selectedBuyer && (
              <div className="bg-blue-50 rounded-lg p-4 grid sm:grid-cols-2 gap-3 text-sm">
                {selectedBuyer.email && <div><span className="text-slate-500">Email:</span> <span className="font-medium ml-2">{selectedBuyer.email}</span></div>}
                {selectedBuyer.phone && <div><span className="text-slate-500">Phone:</span> <span className="font-medium ml-2">{selectedBuyer.phone}</span></div>}
                {selectedBuyer.address && <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium ml-2">{selectedBuyer.address}</span></div>}
                {selectedBuyer.shippingAddress && <div className="sm:col-span-2"><span className="text-slate-500">Ship To:</span> <span className="font-medium ml-2">{selectedBuyer.shippingAddress}</span></div>}
                {selectedBuyer.gstin && <div><span className="text-slate-500">GSTIN:</span> <span className="font-medium ml-2">{selectedBuyer.gstin}</span></div>}
              </div>
            )}

            <div>
              <label className="form-label">Notes</label>
              <textarea {...register("notes")} className="form-input resize-none" rows={2} placeholder="Optional notes..." />
            </div>
          </div>

          {/* Section 2: Order Items */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Order Items</h2>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3">Item Name *</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3">Description</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3 w-24">Qty *</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3 w-28">Rate (₹) *</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3 w-28">Amount</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {fields.map((field, idx) => {
                    const qty = Number(items[idx]?.qty) || 0;
                    const rate = Number(items[idx]?.rate) || 0;
                    const amount = qty * rate;
                    return (
                      <tr key={field.id}>
                        <td className="pr-3 pb-2">
                          <input {...register(`items.${idx}.itemName`)} className="form-input" placeholder="e.g. Silk Fabric" />
                          {errors.items?.[idx]?.itemName && <p className="form-error">{errors.items[idx].itemName?.message}</p>}
                        </td>
                        <td className="pr-3 pb-2">
                          <input {...register(`items.${idx}.description`)} className="form-input" placeholder="Optional" />
                        </td>
                        <td className="pr-3 pb-2">
                          <input type="number" step="0.01" min="0" {...register(`items.${idx}.qty`, { valueAsNumber: true })} className="form-input" placeholder="0" />
                          {errors.items?.[idx]?.qty && <p className="form-error">{errors.items[idx].qty?.message}</p>}
                        </td>
                        <td className="pr-3 pb-2">
                          <input type="number" step="0.01" min="0" {...register(`items.${idx}.rate`, { valueAsNumber: true })} className="form-input" placeholder="0.00" />
                          {errors.items?.[idx]?.rate && <p className="form-error">{errors.items[idx].rate?.message}</p>}
                        </td>
                        <td className="pr-3 pb-2">
                          <div className="form-input bg-slate-50 text-slate-700 cursor-default">{formatCurrency(amount)}</div>
                        </td>
                        <td className="pb-2">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errors.items && typeof errors.items === "object" && "message" in errors.items && (
              <p className="form-error">{(errors.items as { message?: string }).message}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => append({ itemName: "", description: "", qty: 0, rate: 0 })}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
              <div className="text-right">
                <div className="text-xs text-slate-500">Total Order Value</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(totalValue)}</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createOrder.isPending} className="btn-primary">
              {createOrder.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Order"}
            </button>
          </div>
        </form>
      </div>

      {/* Buyer Sheet */}
      {showBuyerForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBuyerForm(false)} />
          <div className="relative z-50 w-full sm:w-96 sm:h-screen bg-white shadow-2xl overflow-y-auto">
            <BuyerForm
              onSuccess={(buyer) => {
                selectBuyer(buyer);
                setShowBuyerForm(false);
                qc.invalidateQueries({ queryKey: ["buyers-minimal"] });
              }}
              onClose={() => setShowBuyerForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <NewOrderContent />
    </Suspense>
  );
}
