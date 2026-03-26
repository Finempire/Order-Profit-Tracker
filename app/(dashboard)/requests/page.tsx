"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SlideUpModal } from "@/components/shared/SlideUpModal";
import { NewPOContent } from "@/components/requests/NewPOContent";
import { POReviewModal } from "@/components/requests/POReviewModal";
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, FileText, Filter, RefreshCw } from "lucide-react";
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
    <div className="p-4 lg:p-5 space-y-0" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* Excel Toolbar */}
      <div className="xls-toolbar">
        <div className="xls-toolbar-title">
          <span className="xls-toolbar-icon">XL</span>
          <span>PurchaseOrders.xlsx</span>
          <span className="text-slate-400 font-normal text-xs ml-1">— {total} rows</span>
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="xls-toolbar-btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <select value={requestType} onChange={(e) => { setRequestType(e.target.value); setPage(1); }}
          className="xls-toolbar-btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
          <option value="">All Types</option>
          <option value="MATERIAL">Material</option>
          <option value="EXPENSE">Expense</option>
        </select>

        <button onClick={() => qc.invalidateQueries({ queryKey: ["requests"] })} className="xls-toolbar-btn" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>

        {canRaise && (
          <button onClick={() => setShowNewPOModal(true)} className="xls-toolbar-btn xls-toolbar-btn-primary">
            <Plus className="w-3 h-3" /> Raise PO
          </button>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="xls-wrap">
        <table className="xls-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PO No.</th>
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
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(11)].map((_, j) => (
                  <td key={j}><div className="h-3 bg-slate-100 animate-pulse rounded w-16" /></td>
                ))}</tr>
              ))
            ) : requests.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-slate-400">No purchase orders found</td></tr>
            ) : (
              <>
                {requests.map((req: {
                  id: string; requestNumber: string; requestType: string; description: string; estimatedAmount: number;
                  status: string; rejectionNote: string | null; createdAt: string;
                  order: { id: string; orderNumber: string }; orderItem: { itemName: string } | null;
                  requestedBy: { name: string };
                }, idx: number) => (
                  <tr key={req.id}>
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td>
                      <span className="font-mono text-xs font-semibold" style={{ color: "#217346" }}>{req.requestNumber}</span>
                    </td>
                    <td>
                      <Link href={`/orders/${req.order.id}`} className="text-xs hover:underline" style={{ color: "#217346" }}>
                        {req.order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">{req.orderItem?.itemName || "—"}</td>
                    <td><StatusBadge status={req.requestType} /></td>
                    <td className="text-xs text-slate-600 max-w-[160px]">
                      <span className="line-clamp-1">{req.description}</span>
                    </td>
                    <td className="xls-num font-semibold">{formatCurrency(req.estimatedAmount)}</td>
                    <td>
                      <div title={req.rejectionNote || undefined}><StatusBadge status={req.status} /></div>
                    </td>
                    <td className="text-xs text-slate-600">{req.requestedBy.name}</td>
                    <td className="text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/requests/${req.id}`} className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="View PO Document">
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                        {canApprove && (
                          <button
                            onClick={() => setReviewId(req.id)}
                            className="p-1 rounded hover:bg-blue-50"
                            title={req.status === "PENDING" ? "Review & Approve" : "Preview PO"}
                            style={{ color: "#217346" }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {req.status === "APPROVED" && (
                          <Link href={`/procurement/${req.id}`} className="text-xs hover:underline font-medium" style={{ color: "#217346" }}>
                            Invoice
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmId(req.id)}
                            className="p-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Delete PO"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length < 5 && [...Array(5 - requests.length)].map((_, i) => (
                  <tr key={`empty-${i}`} className="xls-empty">
                    {[...Array(11)].map((_, j) => (
                      <td key={j}>{j === 0 ? requests.length + i + 1 : ""}</td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Status Bar */}
      <div className="xls-statusbar">
        <div className="flex items-center gap-3">
          <span className="xls-sheet-tab">PurchaseOrders</span>
          <span className="text-white/60">Sheet1</span>
        </div>
        <div className="flex items-center gap-4">
          {requests.length > 0 && (
            <span>Total: {formatCurrency(requests.reduce((s: number, r: { estimatedAmount: number }) => s + r.estimatedAmount, 0))}</span>
          )}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">‹</button>
              <span>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-1.5 py-0.5 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-40">›</button>
            </div>
          )}
          <span className="text-white/60">Count: {total}</span>
        </div>
      </div>

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
          <div className="relative z-50 bg-white rounded shadow-2xl p-6 w-full max-w-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Purchase Order?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="xls-toolbar-btn px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
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
