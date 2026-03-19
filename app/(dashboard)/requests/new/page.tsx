"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { requestSchema, type RequestFormValues } from "@/lib/validations/request";

interface OrderOption {
  id: string;
  orderNumber: string;
  status: string;
  buyer: { name: string };
  items: { id: string; itemName: string }[];
}

export default function NewRequestPage() {
  const router = useRouter();
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [step, setStep] = useState(1);

  const { data: ordersData } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => fetch("/api/orders?status=ACTIVE&limit=100").then((r) => r.json()),
  });

  const orders: OrderOption[] = ordersData?.data?.orders || [];
  const filteredOrders = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.buyer.name.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { qty: 0, rate: 0, requestType: "MATERIAL" },
  });

  const qty = watch("qty");
  const rate = watch("rate");
  const estimatedAmount = (Number(qty) || 0) * (Number(rate) || 0);

  const createRequest = useMutation({
    mutationFn: (data: RequestFormValues) =>
      fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, qty: Number(data.qty), rate: Number(data.rate) }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Request ${res.data.requestNumber} raised!`);
        router.push("/requests");
      } else {
        toast.error(res.error || "Failed to raise request");
      }
    },
  });

  const goToStep2 = async () => {
    const ok = await trigger(["orderId", "requestType"]);
    if (ok && selectedOrder) setStep(2);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          ) : (
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Raise Purchase Request</h1>
            <p className="text-slate-500 text-sm">Step {step} of 2</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-blue-600" : "bg-slate-200"}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit((data) => createRequest.mutate(data))}>
          {step === 1 && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-slate-900">Step 1: Link to Order</h2>

              {/* Order selector */}
              <div>
                <label className="form-label">Order *</label>
                <input type="hidden" {...register("orderId")} />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
                    className="form-input text-left flex items-center justify-between w-full"
                  >
                    <span className={selectedOrder ? "text-slate-900" : "text-slate-400"}>
                      {selectedOrder ? `${selectedOrder.orderNumber} — ${selectedOrder.buyer.name}` : "Select active order..."}
                    </span>
                    {orderDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {orderDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-100">
                        <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="form-input text-sm" placeholder="Search orders..." autoFocus />
                      </div>
                      {filteredOrders.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 text-center">No active orders found</div>
                      ) : (
                        filteredOrders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrder(o);
                              setValue("orderId", o.id);
                              setValue("orderItemId", "");
                              setOrderDropdownOpen(false);
                              setOrderSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                          >
                            <div className="font-medium text-slate-900">{o.orderNumber}</div>
                            <div className="text-xs text-slate-400">{o.buyer.name}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.orderId && <p className="form-error">{errors.orderId.message}</p>}
              </div>

              {/* Order Item */}
              {selectedOrder && (
                <div>
                  <label className="form-label">Order Item (optional)</label>
                  <select {...register("orderItemId")} className="form-input">
                    <option value="">— Not linked to specific item —</option>
                    {selectedOrder.items.map((item) => (
                      <option key={item.id} value={item.id}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Request Type */}
              <div>
                <label className="form-label">Request Type *</label>
                <div className="flex gap-2">
                  {["MATERIAL", "EXPENSE"].map((type) => (
                    <label key={type} className="flex-1">
                      <input type="radio" {...register("requestType")} value={type} className="sr-only" />
                      <div
                        onClick={() => setValue("requestType", type as "MATERIAL" | "EXPENSE")}
                        className={`flex items-center justify-center py-2.5 border rounded-lg cursor-pointer text-sm font-medium transition-all ${
                          watch("requestType") === type
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {type}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.requestType && <p className="form-error">{errors.requestType.message}</p>}
              </div>

              <button type="button" onClick={goToStep2} disabled={!selectedOrder} className="btn-primary w-full justify-center">
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Step 2: Request Details</h2>
                {selectedOrder && (
                  <p className="text-xs text-slate-500 mt-1">
                    Order: <span className="font-medium text-blue-600">{selectedOrder.orderNumber}</span> &bull; {selectedOrder.buyer.name}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea {...register("description")} className="form-input resize-none" rows={3} placeholder="What do you need to purchase and why?" />
                {errors.description && <p className="form-error">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Quantity *</label>
                  <input type="number" step="0.01" min="0" {...register("qty", { valueAsNumber: true })} className="form-input" placeholder="0" />
                  {errors.qty && <p className="form-error">{errors.qty.message}</p>}
                </div>
                <div>
                  <label className="form-label">Rate (₹) *</label>
                  <input type="number" step="0.01" min="0" {...register("rate", { valueAsNumber: true })} className="form-input" placeholder="0.00" />
                  {errors.rate && <p className="form-error">{errors.rate.message}</p>}
                </div>
              </div>

              {/* Estimated amount */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Estimated Amount</div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(estimatedAmount)}</div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button type="submit" disabled={createRequest.isPending} className="btn-primary flex-1">
                  {createRequest.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
