"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function ReportsPage() {
  const { data: ordersData } = useQuery({
    queryKey: ["reports-orders"],
    queryFn: () => fetch("/api/orders?limit=100").then((r) => r.json()),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["reports-invoices"],
    queryFn: () => fetch("/api/invoices?limit=100").then((r) => r.json()),
  });

  const orders = ordersData?.data?.orders || [];
  const invoices = invoicesData?.data?.invoices || [];

  const totalOrderValue = orders.reduce((s: number, o: { orderValue: number }) => s + o.orderValue, 0);
  const totalEstCost = orders.reduce((s: number, o: { estimatedCost: number }) => s + o.estimatedCost, 0);
  const totalInvoiced = orders.reduce((s: number, o: { invoicedCost: number }) => s + o.invoicedCost, 0);
  const totalPaid = invoices.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0);

  const statusCounts: Record<string, number> = {};
  orders.forEach((o: { status: string }) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const payStatusCounts: Record<string, number> = {};
  invoices.forEach((i: { paymentStatus: string }) => { payStatusCounts[i.paymentStatus] = (payStatusCounts[i.paymentStatus] || 0) + 1; });
  const payPieData = Object.entries(payStatusCounts).map(([name, value]) => ({ name, value }));

  const costChartData = orders.slice(0, 15).map((o: { orderNumber: string; estimatedCost: number; invoicedCost: number; paidAmount: number; orderValue: number }) => ({
    orderNumber: o.orderNumber,
    "Order Value": o.orderValue,
    "Est. Cost": o.estimatedCost,
    "Invoiced": o.invoicedCost,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm">Financial overview and analytics</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="kpi-label">Total Order Value</div>
          <div className="kpi-value text-xl">{formatCurrency(totalOrderValue)}</div>
          <div className="kpi-sub">{orders.length} orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Estimated Cost</div>
          <div className="kpi-value text-xl">{formatCurrency(totalEstCost)}</div>
          <div className="kpi-sub">Gross margin: {totalOrderValue > 0 ? (((totalOrderValue - totalEstCost) / totalOrderValue) * 100).toFixed(1) : 0}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Invoiced</div>
          <div className="kpi-value text-xl">{formatCurrency(totalInvoiced)}</div>
          <div className="kpi-sub">{invoices.length} invoices</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Paid</div>
          <div className="kpi-value text-xl text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">Balance: {formatCurrency(totalInvoiced - totalPaid)}</div>
        </div>
      </div>

      {/* Cost vs Order Value Chart */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Order Value vs Costs (Last 15 Orders)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={costChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="orderNumber" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Bar dataKey="Order Value" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Est. Cost" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Invoiced" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Order Status Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusPieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Invoice Payment Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={payPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {payPieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
