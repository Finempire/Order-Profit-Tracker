"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BuyerForm } from "@/components/forms/BuyerForm";
import { useQueryClient } from "@tanstack/react-query";

export default function BuyersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["buyers", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });
      return fetch(`/api/buyers?${params}`).then((r) => r.json());
    },
  });

  const buyers = data?.data?.buyers || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buyers</h1>
          <p className="text-slate-500 text-sm">{total} buyers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Buyer</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search buyers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="form-input pl-9" />
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Orders</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 animate-pulse rounded w-24" /></td>)}</tr>)
              ) : buyers.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No buyers found</td></tr>
              ) : (
                buyers.map((buyer: { id: string; name: string; phone: string | null; email: string | null; gstin: string | null; createdAt: string; _count: { orders: number } }) => (
                  <tr key={buyer.id}>
                    <td className="font-medium">
                      <Link href={`/buyers/${buyer.id}`} className="text-blue-600 hover:underline">{buyer.name}</Link>
                    </td>
                    <td className="text-slate-600">{buyer.phone || "—"}</td>
                    <td className="text-slate-600">{buyer.email || "—"}</td>
                    <td className="text-slate-500 text-xs font-mono">{buyer.gstin || "—"}</td>
                    <td><span className="badge badge-active">{buyer._count.orders} orders</span></td>
                    <td className="text-slate-500 text-xs">{formatDate(buyer.createdAt)}</td>
                    <td>
                      <Link href={`/buyers/${buyer.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
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

      {/* Buyer Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-50 w-full sm:w-96 sm:h-screen bg-white shadow-2xl overflow-y-auto">
            <BuyerForm onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["buyers"] }); }} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
