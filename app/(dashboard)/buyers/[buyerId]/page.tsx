"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BuyerDetailPage() {
  const { buyerId } = useParams<{ buyerId: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer", buyerId],
    queryFn: () => fetch(`/api/buyers/${buyerId}`).then((r) => r.json()),
  });

  const buyer = data?.data;

  if (isLoading) return <div className="p-6"><div className="h-40 bg-slate-100 animate-pulse rounded-xl" /></div>;
  if (!buyer) return <div className="p-6 text-center text-slate-500">Buyer not found</div>;

  const totalOrderValue = buyer.orders.reduce((s: number, o: { items: { amount: number }[] }) => s + o.items.reduce((ss: number, i: { amount: number }) => ss + i.amount, 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{buyer.name}</h1>
          <p className="text-slate-500 text-sm">{buyer.orders.length} orders &bull; Total: {formatCurrency(totalOrderValue)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-slate-900">Contact Details</h2>
          <dl className="space-y-2">
            {[
              ["Email", buyer.email || "—"],
              ["Phone", buyer.phone || "—"],
              ["GSTIN", buyer.gstin || "—"],
              ["Address", buyer.address || "—"],
              ["Ship To", buyer.shippingAddress || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="text-sm text-slate-500 w-16 flex-shrink-0">{label}</dt>
                <dd className="text-sm text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Orders ({buyer.orders.length})</h2>
        {buyer.orders.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No orders yet</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Order No.</th><th>Date</th><th>Items</th><th>Value</th><th>Status</th></tr>
              </thead>
              <tbody>
                {buyer.orders.map((order: {
                  id: string; orderNumber: string; orderDate: string; status: string;
                  items: { amount: number }[];
                }) => (
                  <tr key={order.id}>
                    <td><Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-sm">{order.orderNumber}</Link></td>
                    <td className="text-sm text-slate-600">{formatDate(order.orderDate)}</td>
                    <td className="text-slate-600">{order.items.length} items</td>
                    <td className="font-semibold">{formatCurrency(order.items.reduce((s, i) => s + i.amount, 0))}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
