"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RejectModal } from "@/components/shared/RejectModal";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { NewPOContent } from "@/components/requests/NewPOContent";
import { POReviewModal } from "@/components/requests/POReviewModal";
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function RequestsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const qc = useQueryClient();

  const canApprove = ["ADMIN", "CEO", "ACCOUNTANT"].includes(role || "");
  const canRaise = ["ADMIN", "PRODUCTION"].includes(role || "");
  const isAdmin = role === "ADMIN";

  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [page, setPage] = useState(1);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; number: string } | null>(null);
  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["requests", status, requestType, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(status && { status }), ...(requestType && { requestType }) });
      return fetch(`/api/requests?${params}`).then((r) => r.json());
    },
  });

  const requests = data?.data?.requests || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      fetch(`/api/requests/${id}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejectionNote: note }) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["requests"] }); setRejectOpen(false); } else toast.error(res.error); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/requests/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Purchase request deleted");
        qc.invalidateQueries({ queryKey: ["requests"] });
        setDeleteConfirmId(null);
      } else {
        toast.error(res.error || "Failed to delete");
      }
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Requests</h1>
          <p className="text-slate-500 text-sm">{total} requests</p>
        </div>
        {canRaise && (
          <button onClick={() => setShowNewPOModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Raise Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={requestType} onChange={(e) => { setRequestType(e.target.value); setPage(1); }} className="form-input w-40">
          <option value="">All Types</option>
          <option value="MATERIAL">Material</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Req No.</th>
                <th>Order No.</th>
                <th>Item</th>
                <th>Type</th>
                <th>Description</th>
                <th>Est. Amount</th>
                <th>Status</th>
                <th>Raised By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(10)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 animate-pulse rounded w-20" /></td>)}</tr>)
              ) : requests.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">No requests found</td></tr>
              ) : (
                requests.map((req: {
                  id: string; requestNumber: string; requestType: string; description: string; estimatedAmount: number;
                  status: string; rejectionNote: string | null; createdAt: string;
                  order: { id: string; orderNumber: string }; orderItem: { itemName: string } | null;
                  requestedBy: { name: string };
                }) => (
                  <tr key={req.id}>
                    <td><span className="font-mono text-xs font-medium text-blue-600">{req.requestNumber}</span></td>
                    <td>
                      <Link href={`/orders/${req.order.id}`} className="text-blue-600 hover:underline text-sm">{req.order.orderNumber}</Link>
                    </td>
                    <td className="text-sm">{req.orderItem?.itemName || "—"}</td>
                    <td><StatusBadge status={req.requestType} /></td>
                    <td className="text-sm text-slate-600 max-w-xs truncate">{req.description}</td>
                    <td className="font-medium">{formatCurrency(req.estimatedAmount)}</td>
                    <td>
                      <div title={req.rejectionNote || undefined}><StatusBadge status={req.status} /></div>
                    </td>
                    <td className="text-sm text-slate-600">{req.requestedBy.name}</td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {/* View full PO document */}
                        <Link href={`/requests/${req.id}`} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="View PO Document">
                          <FileText className="w-3.5 h-3.5" />
                        </Link>

                        {/* Review preview — opens POReviewModal */}
                        {canApprove && (
                          <button
                            onClick={() => setReviewId(req.id)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                            title={req.status === "PENDING" ? "Review & Approve" : "Preview PO"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Add Invoice link for approved POs */}
                        {req.status === "APPROVED" && (
                          <Link href={`/procurement/${req.id}`} className="text-xs text-blue-600 hover:underline">Add Invoice</Link>
                        )}

                        {/* Admin delete */}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmId(req.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Delete PO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal (for inline reject from list, without Review modal) */}
      <RejectModal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={(note) => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, note })} requestNumber={rejectTarget?.number} isLoading={rejectMutation.isPending} />

      {/* PO Review Modal */}
      <POReviewModal
        requestId={reviewId}
        onClose={() => setReviewId(null)}
        canApprove={canApprove}
        onApproved={() => qc.invalidateQueries({ queryKey: ["requests"] })}
      />

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Purchase Request?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New PO Modal */}
      <SlideUpModal
        isOpen={showNewPOModal}
        onClose={() => setShowNewPOModal(false)}
        title="New Purchase Order"
        maxWidth="3xl"
      >
        <NewPOContent
          onClose={() => setShowNewPOModal(false)}
          onSuccess={({ number }) => {
            setShowNewPOModal(false);
            toast.success(`PO ${number} raised successfully!`);
            qc.invalidateQueries({ queryKey: ["requests"] });
          }}
        />
      </SlideUpModal>
    </div>
  );
}
