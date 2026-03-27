"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Trash2, RefreshCw } from "lucide-react";
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
    <div className="p-4 lg:p-5 space-y-0" style={{ background: "#f0f0f0", minHeight: "100%" }}>

      {/* Excel Toolbar */}
      <div className="xls-toolbar">
        <div className="xls-toolbar-title">
          <span className="xls-toolbar-icon">XL</span>
          <span>Vendors.xlsx</span>
          <span className="text-slate-400 font-normal text-xs ml-1">— {total} rows</span>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="xls-toolbar-btn pl-6 w-40"
            style={{ padding: "0.25rem 0.5rem 0.25rem 1.5rem", fontSize: "0.75rem" }}
          />
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ["vendors"] })} className="xls-toolbar-btn" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="xls-toolbar-btn xls-toolbar-btn-primary">
            <Plus className="w-3 h-3" /> Add Vendor
          </button>
        )}
      </div>

      <div className="xls-wrap">
        <table className="xls-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>GSTIN</th>
              <th>Invoices</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-3 bg-slate-100 animate-pulse rounded w-20" /></td>)}</tr>
              ))
            ) : vendors.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">No vendors found</td></tr>
            ) : (
              <>
                {vendors.map((vendor: { id: string; name: string; phone: string | null; email: string | null; gstin: string | null; createdAt: string; _count: { invoices: number } }, idx: number) => (
                  <tr key={vendor.id}>
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td className="font-medium">
                      <Link href={`/vendors/${vendor.id}`} className="hover:underline" style={{ color: "#217346" }}>{vendor.name}</Link>
                    </td>
                    <td className="text-slate-600 text-xs">{vendor.phone || "—"}</td>
                    <td className="text-slate-600 text-xs">{vendor.email || "—"}</td>
                    <td className="text-slate-500 text-xs font-mono">{vendor.gstin || "—"}</td>
                    <td className="text-center text-xs font-semibold" style={{ color: "#217346" }}>{vendor._count.invoices}</td>
                    <td className="text-slate-500 text-xs">{formatDate(vendor.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/vendors/${vendor.id}`} className="text-xs hover:underline font-medium" style={{ color: "#217346" }}>View →</Link>
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirmId(vendor.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Delete vendor">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {vendors.length < 5 && [...Array(5 - vendors.length)].map((_, i) => (
                  <tr key={`empty-${i}`} className="xls-empty">
                    {[...Array(8)].map((_, j) => <td key={j}>{j === 0 ? vendors.length + i + 1 : ""}</td>)}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="xls-statusbar">
        <div className="flex items-center gap-2"><span className="xls-sheet-tab">Vendors</span></div>
        <div className="flex items-center gap-4">
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

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-50 bg-white rounded shadow-2xl p-6 w-full max-w-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Vendor?</h3>
                <p className="text-sm text-slate-500">This cannot be undone. Vendors with invoices cannot be deleted.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="xls-toolbar-btn px-4">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
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
