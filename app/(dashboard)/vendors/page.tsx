"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { VendorForm } from "@/components/forms/VendorForm";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function VendorsPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });
      return fetch(`/api/vendors?${params}`).then((r) => r.json());
    },
  });

  const vendors = data?.data?.vendors || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/vendors/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Vendor deleted");
        qc.invalidateQueries({ queryKey: ["vendors"] });
        setDeleteConfirmId(null);
      } else {
        toast.error(res.error || "Failed to delete vendor");
      }
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500 text-sm">{total} vendors</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Vendor</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search vendors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="form-input pl-9" />
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Invoices</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 animate-pulse rounded w-24" /></td>)}</tr>)
              ) : vendors.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No vendors found</td></tr>
              ) : (
                vendors.map((vendor: { id: string; name: string; phone: string | null; email: string | null; gstin: string | null; createdAt: string; _count: { invoices: number } }) => (
                  <tr key={vendor.id}>
                    <td className="font-medium">
                      <Link href={`/vendors/${vendor.id}`} className="text-blue-600 hover:underline">{vendor.name}</Link>
                    </td>
                    <td className="text-slate-600">{vendor.phone || "—"}</td>
                    <td className="text-slate-600">{vendor.email || "—"}</td>
                    <td className="text-slate-500 text-xs font-mono">{vendor.gstin || "—"}</td>
                    <td><span className="badge badge-active">{vendor._count.invoices} invoices</span></td>
                    <td className="text-slate-500 text-xs">{formatDate(vendor.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/vendors/${vendor.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirmId(vendor.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Delete vendor"
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
              <span className="text-sm text-slate-600">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

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
                <h3 className="font-semibold text-slate-900">Delete Vendor?</h3>
                <p className="text-sm text-slate-500">This cannot be undone. Vendors with invoices cannot be deleted.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-50 w-full sm:w-96 sm:h-screen bg-white shadow-2xl overflow-y-auto">
            <VendorForm onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["vendors"] }); }} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
