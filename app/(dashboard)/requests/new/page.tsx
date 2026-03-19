"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, CheckCircle2, Scissors, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { requestSchema, type RequestFormValues } from "@/lib/validations/request";
import Link from "next/link";

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
  const [submitted, setSubmitted] = useState<string | null>(null); // request number after success

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

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors }, trigger,
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { qty: 0, rate: 0, requestType: "MATERIAL" },
  });

  const qty  = watch("qty");
  const rate = watch("rate");
  const requestType = watch("requestType");
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
        setSubmitted(res.data.requestNumber);
      } else {
        toast.error(res.error || "Failed to raise request");
      }
    },
  });

  const goToStep2 = async () => {
    const ok = await trigger(["orderId", "requestType"]);
    if (ok && selectedOrder) setStep(2);
  };

  /* ── Success Screen ─────────────────────────── */
  if (submitted) {
    return (
      <div className="p-4 lg:p-6 max-w-md mx-auto">
        <div className="card success-screen">
          <div className="success-check-circle">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Request Submitted!</h2>
          <p className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mb-3">{submitted}</p>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Your request is pending approval from management. You'll see it in My Requests.
          </p>
          <div className="flex flex-col gap-2 w-full">
            <Link href="/requests" className="btn-primary justify-center w-full py-3">
              View My Requests
            </Link>
            <button
              onClick={() => {
                setSubmitted(null);
                setStep(1);
                setSelectedOrder(null);
              }}
              className="btn-secondary justify-center w-full py-2.5"
            >
              Raise Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === 2 ? setStep(1) : router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Raise Purchase Request</h1>
            <p className="text-slate-400 text-sm">Step {step} of 2</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="step-bar">
          <div className="step-bar-fill" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>

        <form onSubmit={handleSubmit((data) => createRequest.mutate(data))}>

          {/* ── STEP 1: Link to Order ──────────────── */}
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
                    <span className={selectedOrder ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {selectedOrder
                        ? `${selectedOrder.orderNumber} — ${selectedOrder.buyer.name}`
                        : "Select active order..."}
                    </span>
                    {orderDropdownOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>
                  {orderDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
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
                            onClick={() => {
                              setSelectedOrder(o);
                              setValue("orderId", o.id);
                              setValue("orderItemId", "");
                              setOrderDropdownOpen(false);
                              setOrderSearch("");
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-semibold text-slate-900">{o.orderNumber}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{o.buyer.name}</div>
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
                  <label className="form-label">Related Item <span className="text-slate-400 font-normal">(optional)</span></label>
                  <select {...register("orderItemId")} className="form-input">
                    <option value="">— Not linked to specific item —</option>
                    {selectedOrder.items.map((item) => (
                      <option key={item.id} value={item.id}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Request Type — pill toggle */}
              <div>
                <label className="form-label">Request Type *</label>
                <div className="flex gap-3">
                  {(["MATERIAL", "EXPENSE"] as const).map((type) => {
                    const Icon = type === "MATERIAL" ? Scissors : Wallet;
                    const isSelected = requestType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue("requestType", type)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl cursor-pointer text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-md"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type === "MATERIAL" ? "🧵 Material" : "💰 Expense"}
                      </button>
                    );
                  })}
                </div>
                {errors.requestType && <p className="form-error">{errors.requestType.message}</p>}
              </div>

              {/* Sticky CTA */}
              <div className="sticky-cta -mx-6 -mb-6 rounded-b-xl">
                <button
                  type="button"
                  onClick={goToStep2}
                  disabled={!selectedOrder}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Request Details ────────────── */}
          {step === 2 && (
            <div className="card space-y-5">
              {/* Context */}
              <div>
                <h2 className="font-semibold text-slate-900">Step 2: Request Details</h2>
                {selectedOrder && (
                  <p className="text-xs text-slate-500 mt-1">
                    Order: <span className="font-semibold text-blue-600">{selectedOrder.orderNumber}</span>
                    {" · "}{selectedOrder.buyer.name}
                    {" · "}<span className={`font-semibold ${requestType === "MATERIAL" ? "text-violet-600" : "text-amber-600"}`}>
                      {requestType}
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description *</label>
                <textarea
                  {...register("description")}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="What do you need to purchase and why?"
                />
                {errors.description && <p className="form-error">{errors.description.message}</p>}
              </div>

              {/* Qty + Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("qty", { valueAsNumber: true })}
                    className="form-input"
                    placeholder="0"
                  />
                  {errors.qty && <p className="form-error">{errors.qty.message}</p>}
                </div>
                <div>
                  <label className="form-label">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("rate", { valueAsNumber: true })}
                    className="form-input"
                    placeholder="0.00"
                  />
                  {errors.rate && <p className="form-error">{errors.rate.message}</p>}
                </div>
              </div>

              {/* Estimated Amount */}
              <div className="amount-display">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Estimated Amount</div>
                <div className="text-3xl font-bold text-blue-700 tabular-nums">{formatCurrency(estimatedAmount)}</div>
              </div>

              {/* Sticky CTAs */}
              <div className="sticky-cta -mx-6 -mb-6 rounded-b-xl flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-3">
                  ← Back
                </button>
                <button type="submit" disabled={createRequest.isPending} className="btn-primary flex-2 flex-1 justify-center py-3 text-base">
                  {createRequest.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : "✅ Submit Request"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
