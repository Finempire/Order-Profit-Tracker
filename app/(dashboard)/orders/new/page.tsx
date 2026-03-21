"use client";

import { useState, Suspense } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Loader2, ArrowLeft, ChevronDown, ChevronUp, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { orderSchema, CURRENCIES } from "@/lib/validations/order";
import { BuyerForm } from "@/components/forms/BuyerForm";

interface OrderFormValues {
  orderNumber: string;
  orderDate: Date;
  shippingDate?: Date | null;
  buyerId: string;
  notes?: string;
  currency: string;
  exchangeRate: number;
  items: {
    id?: string;
    itemName: string;
    description?: string;
    qty: number;
    rate: number;
    discount: number;
  }[];
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
      orderNumber: `ORD-${new Date().getFullYear()}-001`,
      orderDate: new Date(),
      currency: "INR",
      exchangeRate: 1,
      items: [{ itemName: "", description: "", qty: 1, rate: 0, discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const currency = watch("currency");
  const exchangeRate = watch("exchangeRate");
  const isForeign = currency !== "INR";
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₹";

  const subtotalForeign = watchedItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;
    return sum + (qty * rate - discount);
  }, 0);
  const subtotalINR = subtotalForeign * (Number(exchangeRate) || 1);

  const createOrder = useMutation({
    mutationFn: (data: OrderFormValues) =>
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          orderDate: data.orderDate instanceof Date ? data.orderDate.toISOString() : data.orderDate,
          shippingDate: data.shippingDate instanceof Date ? data.shippingDate.toISOString() : data.shippingDate ?? null,
          exchangeRate: Number(data.exchangeRate) || 1,
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
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────── */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">New Order</h1>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              Draft
            </span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit((data) => createOrder.mutate(data as OrderFormValues))}
          className="space-y-6"
        >
          {/* ── Order Information ───────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Order Information</h2>

            {/* Row 1: Order Number, Order Date, Shipping Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("orderNumber")}
                  placeholder="ORD-2026-001"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
                {errors.orderNumber && (
                  <p className="mt-1 text-xs text-red-500">{errors.orderNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    {...register("orderDate", { valueAsDate: true })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none"
                  />
                  <Calendar className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.orderDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.orderDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Shipping Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    {...register("shippingDate", { valueAsDate: true })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none"
                  />
                  <Calendar className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Currency section (gray bg) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5 p-4 bg-slate-50 border border-slate-100 rounded-lg">
              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Order Currency
                </label>
                <div className="relative">
                  <select
                    {...register("currency")}
                    onChange={(e) => {
                      setValue("currency", e.target.value);
                      if (e.target.value === "INR") setValue("exchangeRate", 1);
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Exchange rate — only for foreign currencies */}
              {isForeign ? (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Exchange Rate (1 {currency} = ? INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.0001"
                      {...register("exchangeRate", { valueAsNumber: true })}
                      placeholder="e.g. 83.50"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  {errors.exchangeRate && (
                    <p className="mt-1 text-xs text-red-500">{errors.exchangeRate.message}</p>
                  )}
                </div>
              ) : null}

              {/* Buyer */}
              <div className={!isForeign ? "sm:col-span-2" : ""}>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Buyer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input type="hidden" {...register("buyerId")} />
                    <button
                      type="button"
                      onClick={() => setBuyerDropdownOpen(!buyerDropdownOpen)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm flex items-center justify-between"
                    >
                      <span className={selectedBuyer ? "text-slate-900" : "text-slate-400"}>
                        {selectedBuyer?.name || "Select a buyer..."}
                      </span>
                      {buyerDropdownOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {buyerDropdownOpen && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                          <input
                            value={buyerSearch}
                            onChange={(e) => setBuyerSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> New Buyer
                  </button>
                </div>
                {errors.buyerId && (
                  <p className="mt-1 text-xs text-red-500">{errors.buyerId.message}</p>
                )}
              </div>
            </div>

            {/* Buyer info auto-fill */}
            {selectedBuyer && (
              <div className="bg-blue-50 rounded-lg p-4 grid sm:grid-cols-2 gap-3 text-sm mb-5">
                {selectedBuyer.email && <div><span className="text-slate-500">Email:</span> <span className="font-medium ml-1">{selectedBuyer.email}</span></div>}
                {selectedBuyer.phone && <div><span className="text-slate-500">Phone:</span> <span className="font-medium ml-1">{selectedBuyer.phone}</span></div>}
                {selectedBuyer.address && <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium ml-1">{selectedBuyer.address}</span></div>}
                {selectedBuyer.shippingAddress && <div className="sm:col-span-2"><span className="text-slate-500">Ship To:</span> <span className="font-medium ml-1">{selectedBuyer.shippingAddress}</span></div>}
                {selectedBuyer.gstin && <div><span className="text-slate-500">GSTIN:</span> <span className="font-medium ml-1">{selectedBuyer.gstin}</span></div>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Notes</label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Optional notes for internal team or buyer..."
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-y"
              />
            </div>
          </section>

          {/* ── Order Items ─────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Order Items</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse mb-4" style={{ minWidth: 820 }}>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[22%]">
                      Item Name <span className="text-red-500">*</span>
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[22%] pl-3">
                      Description
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[10%] pl-3">
                      Qty <span className="text-red-500">*</span>
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[14%] pl-3">
                      Rate ({currencySymbol}) <span className="text-red-500">*</span>
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[14%] pl-3">
                      Discount ({currencySymbol})
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-500 w-[14%] text-right pr-3">
                      Amount
                    </th>
                    <th className="pb-3 w-[4%]" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const qty = Number(watchedItems[idx]?.qty) || 0;
                    const rate = Number(watchedItems[idx]?.rate) || 0;
                    const discount = Number(watchedItems[idx]?.discount) || 0;
                    const lineAmount = qty * rate - discount;

                    return (
                      <tr
                        key={field.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-2.5">
                          <input
                            {...register(`items.${idx}.itemName`)}
                            placeholder="e.g. Silk Fabric"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                          {errors.items?.[idx]?.itemName && (
                            <p className="text-xs text-red-500 mt-0.5">{errors.items[idx].itemName?.message}</p>
                          )}
                        </td>
                        <td className="py-2.5 pl-3">
                          <input
                            {...register(`items.${idx}.description`)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                        </td>
                        <td className="py-2.5 pl-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.qty`, { valueAsNumber: true })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                          {errors.items?.[idx]?.qty && (
                            <p className="text-xs text-red-500 mt-0.5">{errors.items[idx].qty?.message}</p>
                          )}
                        </td>
                        <td className="py-2.5 pl-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.rate`, { valueAsNumber: true })}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                          {errors.items?.[idx]?.rate && (
                            <p className="text-xs text-red-500 mt-0.5">{errors.items[idx].rate?.message}</p>
                          )}
                        </td>
                        <td className="py-2.5 pl-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.discount`, { valueAsNumber: true })}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-red-600 placeholder-slate-400"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium text-slate-800 tabular-nums text-sm">
                          {currencySymbol}{lineAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            disabled={fields.length === 1}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errors.items && typeof errors.items === "object" && "message" in errors.items && (
              <p className="text-xs text-red-500 mb-3">{(errors.items as { message?: string }).message}</p>
            )}

            {/* Add item + totals */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-2">
              <button
                type="button"
                onClick={() => append({ itemName: "", description: "", qty: 1, rate: 0, discount: 0 })}
                className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>

              {/* Summary box */}
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 min-w-[280px] w-full sm:w-auto">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-500 font-medium">
                    Order Value ({currency})
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {currencySymbol}{subtotalForeign.toFixed(2)}
                  </span>
                </div>
                {isForeign && (
                  <>
                    <div className="h-px bg-slate-200 my-3" />
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-slate-700 font-bold block">Base Value (INR)</span>
                        <span className="text-xs text-slate-500">@ {Number(exchangeRate) || 1} rate</span>
                      </div>
                      <span className="text-xl font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(subtotalINR)}
                      </span>
                    </div>
                  </>
                )}
                {!isForeign && (
                  <div className="text-xs text-slate-400 mt-1">
                    Total Order Value (INR)
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Footer Actions ──────────────────────── */}
          <footer className="flex justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-[0_4px_14px_0_rgba(67,97,238,0.35)] hover:shadow-[0_6px_20px_rgba(67,97,238,0.25)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
            >
              {createOrder.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createOrder.isPending ? "Creating..." : "Create Order"}
            </button>
          </footer>
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
