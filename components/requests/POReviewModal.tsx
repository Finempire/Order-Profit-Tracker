"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RejectModal } from "@/components/shared/RejectModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Check, X, FileText, Paperclip, Loader2, Package,
  User, Calendar, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

type POItem = {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
};

type PODetail = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  description: string;
  estimatedAmount: number;
  notes: string | null;
  attachmentUrl: string | null;
  rejectionNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  order: { id: string; orderNumber: string; status: string; buyer: { name: string } };
  orderItem: { itemName: string } | null;
  requestedBy: { name: string; email: string };
  approvedBy: { name: string } | null;
  items: POItem[];
};

interface POReviewModalProps {
  requestId: string | null;
  onClose: () => void;
  canApprove: boolean;
  onApproved?: () => void;
}

export function POReviewModal({ requestId, onClose, canApprove, onApproved }: POReviewModalProps) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["request-detail", requestId],
    queryFn: () => fetch(`/api/requests/${requestId}`).then((r) => r.json()),
    enabled: !!requestId,
  });

  const po: PODetail | null = data?.data ?? null;

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/requests/${requestId}/approve`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`PO ${po?.requestNumber} approved`);
        qc.invalidateQueries({ queryKey: ["requests"] });
        qc.invalidateQueries({ queryKey: ["request-detail", requestId] });
        onApproved?.();
        onClose();
      } else {
        toast.error(res.error || "Approval failed");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (note: string) =>
      fetch(`/api/requests/${requestId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote: note }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("PO rejected");
        qc.invalidateQueries({ queryKey: ["requests"] });
        qc.invalidateQueries({ queryKey: ["request-detail", requestId] });
        setRejectOpen(false);
        onClose();
      } else {
        toast.error(res.error || "Rejection failed");
      }
    },
  });

  const isPending = po?.status === "PENDING";

  return (
    <>
      <SlideUpModal
        isOpen={!!requestId}
        onClose={onClose}
        title={po ? `Review PO — ${po.requestNumber}` : "Review Purchase Order"}
        maxWidth="3xl"
      >
        {isLoading || !po ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header Strip */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-lg font-bold text-slate-900">{po.requestNumber}</span>
                  <StatusBadge status={po.status} />
                  <StatusBadge status={po.requestType} />
                </div>
                {po.rejectionNote && (
                  <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-1.5 mt-2">
                    Rejection note: {po.rejectionNote}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">Estimated Total</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(po.estimatedAmount)}</div>
              </div>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Order</div>
                  <div className="font-medium text-slate-800">{po.order.orderNumber}</div>
                  <div className="text-xs text-slate-500">{po.order.buyer.name}</div>
                </div>
              </div>
              {po.orderItem && (
                <div className="flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">Order Item</div>
                    <div className="font-medium text-slate-800">{po.orderItem.itemName}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Raised By</div>
                  <div className="font-medium text-slate-800">{po.requestedBy.name}</div>
                  <div className="text-xs text-slate-500">{po.requestedBy.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Date</div>
                  <div className="font-medium text-slate-800">{formatDate(po.createdAt)}</div>
                </div>
              </div>
              {po.approvedBy && (
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">Approved By</div>
                    <div className="font-medium text-slate-800">{po.approvedBy.name}</div>
                    {po.approvedAt && <div className="text-xs text-slate-500">{formatDate(po.approvedAt)}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            {po.items.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Line Items
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-8">#</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Description</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Qty</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Unit</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Rate</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2.5 text-slate-800">{item.description}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{item.qty}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{item.unit}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(item.rate)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-3 py-2.5 text-right text-sm font-semibold text-slate-700">Total</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">{formatCurrency(po.estimatedAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-1">Description</p>
                <p className="text-sm text-slate-600">{po.description}</p>
              </div>
            )}

            {/* Notes */}
            {po.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-amber-800">{po.notes}</p>
              </div>
            )}

            {/* Attachment */}
            {po.attachmentUrl && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                <a
                  href={po.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Attached Document
                </a>
              </div>
            )}

            {/* Approve / Reject Actions */}
            {isPending && canApprove && (
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve PO
                </button>
              </div>
            )}
          </div>
        )}
      </SlideUpModal>

      <RejectModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(note) => rejectMutation.mutate(note)}
        requestNumber={po?.requestNumber}
        isLoading={rejectMutation.isPending}
      />
    </>
  );
}
