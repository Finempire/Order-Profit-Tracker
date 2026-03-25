"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { FileDown } from "lucide-react";
import * as XLSX from "xlsx";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

type Order = {
  orderNumber: string;
  status: string;
  orderValue: number;
  estimatedCost: number;
  invoicedCost: number;
  paidAmount: number;
  buyer: { name: string };
  orderDate: string;
};

type Invoice = {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: string;
  description: string | null;
  qty: number;
  rate: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  vendor: { name: string };
  request: { requestNumber: string };
};

function downloadExcel(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
    }));
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

export default function ReportsPage() {
  const { data: ordersData } = useQuery({
    queryKey: ["reports-orders"],
    queryFn: () => fetch("/api/orders?limit=500").then((r) => r.json()),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["reports-invoices"],
    queryFn: () => fetch("/api/invoices?limit=500").then((r) => r.json()),
  });

  const { data: requestsData } = useQuery({
    queryKey: ["reports-requests"],
    queryFn: () => fetch("/api/requests?limit=500").then((r) => r.json()),
  });

  const orders: Order[]   = ordersData?.data?.orders   || [];
  const invoices: Invoice[] = invoicesData?.data?.invoices || [];
  const requests = requestsData?.data?.requests || [];

  const totalOrderValue = orders.reduce((s, o) => s + o.orderValue, 0);
  const totalEstCost    = orders.reduce((s, o) => s + o.estimatedCost, 0);
  const totalInvoiced   = orders.reduce((s, o) => s + o.invoicedCost, 0);
  const totalPaid       = invoices.reduce((s, i) => s + i.paidAmount, 0);

  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const payStatusCounts: Record<string, number> = {};
  invoices.forEach((i) => { payStatusCounts[i.paymentStatus] = (payStatusCounts[i.paymentStatus] || 0) + 1; });
  const payPieData = Object.entries(payStatusCounts).map(([name, value]) => ({ name, value }));

  const costChartData = orders.slice(0, 15).map((o) => ({
    orderNumber: o.orderNumber,
    "Order Value": o.orderValue,
    "Est. Cost": o.estimatedCost,
    "Invoiced": o.invoicedCost,
  }));

  // ── Export handlers ────────────────────────────────────────────

  const exportOrdersReport = () => {
    const rows = orders.map((o) => ({
      "Order No.":       o.orderNumber,
      "Buyer":           o.buyer?.name ?? "",
      "Order Date":      o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "",
      "Status":          o.status,
      "Order Value (₹)": o.orderValue,
      "Est. Cost (₹)":   o.estimatedCost,
      "Invoiced (₹)":    o.invoicedCost,
      "Paid (₹)":        o.paidAmount,
      "Variance (₹)":    o.invoicedCost - o.estimatedCost,
      "Margin (₹)":      o.orderValue - o.invoicedCost,
      "Margin %":        o.orderValue > 0 ? +((((o.orderValue - o.invoicedCost) / o.orderValue) * 100).toFixed(2)) : 0,
    }));

    // Summary sheet
    const summary = [
      { "Metric": "Total Orders",       "Value": orders.length },
      { "Metric": "Total Order Value",  "Value": totalOrderValue },
      { "Metric": "Total Est. Cost",    "Value": totalEstCost },
      { "Metric": "Total Invoiced",     "Value": totalInvoiced },
      { "Metric": "Total Paid",         "Value": totalPaid },
      { "Metric": "Gross Margin (₹)",   "Value": totalOrderValue - totalInvoiced },
      { "Metric": "Gross Margin %",     "Value": totalOrderValue > 0 ? +((((totalOrderValue - totalInvoiced) / totalOrderValue) * 100).toFixed(2)) : 0 },
    ];

    downloadExcel(
      [{ name: "Summary", rows: summary }, { name: "Orders", rows }],
      `Orders_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportInvoicesReport = () => {
    const rows = invoices.map((i) => ({
      "Invoice No.":      i.invoiceNumber,
      "Invoice Date":     i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString("en-IN") : "",
      "Type":             i.invoiceType,
      "Vendor":           i.vendor?.name ?? "",
      "PO Ref.":          i.request?.requestNumber ?? "",
      "Description":      i.description ?? "",
      "Qty":              i.qty,
      "Rate (₹)":         i.rate,
      "Amount (₹)":       i.amount,
      "GST (₹)":          i.gstAmount,
      "Total (₹)":        i.totalAmount,
      "Paid (₹)":         i.paidAmount,
      "Balance (₹)":      i.totalAmount - i.paidAmount,
      "Payment Status":   i.paymentStatus,
    }));

    downloadExcel(
      [{ name: "Invoices", rows }],
      `Invoices_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportPOReport = () => {
    const rows = requests.map((r: {
      requestNumber: string; requestType: string; status: string;
      estimatedAmount: number; createdAt: string; notes: string | null;
      order: { orderNumber: string }; orderItem: { itemName: string } | null;
      requestedBy: { name: string }; approvedBy: { name: string } | null;
    }) => ({
      "PO Number":       r.requestNumber,
      "Order No.":       r.order?.orderNumber ?? "",
      "Order Item":      r.orderItem?.itemName ?? "",
      "Type":            r.requestType,
      "Status":          r.status,
      "Est. Amount (₹)": r.estimatedAmount,
      "Raised By":       r.requestedBy?.name ?? "",
      "Approved By":     r.approvedBy?.name ?? "",
      "Date":            r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "",
      "Notes":           r.notes ?? "",
    }));

    downloadExcel(
      [{ name: "Purchase Orders", rows }],
      `PurchaseOrders_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportFullReport = () => {
    const orderRows = orders.map((o) => ({
      "Order No.":       o.orderNumber,
      "Buyer":           o.buyer?.name ?? "",
      "Order Date":      o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "",
      "Status":          o.status,
      "Order Value (₹)": o.orderValue,
      "Est. Cost (₹)":   o.estimatedCost,
      "Invoiced (₹)":    o.invoicedCost,
      "Paid (₹)":        o.paidAmount,
      "Margin (₹)":      o.orderValue - o.invoicedCost,
      "Margin %":        o.orderValue > 0 ? +((((o.orderValue - o.invoicedCost) / o.orderValue) * 100).toFixed(2)) : 0,
    }));

    const invoiceRows = invoices.map((i) => ({
      "Invoice No.":    i.invoiceNumber,
      "Date":           i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString("en-IN") : "",
      "Vendor":         i.vendor?.name ?? "",
      "PO Ref.":        i.request?.requestNumber ?? "",
      "Total (₹)":      i.totalAmount,
      "Paid (₹)":       i.paidAmount,
      "Balance (₹)":    i.totalAmount - i.paidAmount,
      "Status":         i.paymentStatus,
    }));

    const poRows = requests.map((r: {
      requestNumber: string; requestType: string; status: string;
      estimatedAmount: number; createdAt: string;
      order: { orderNumber: string }; requestedBy: { name: string };
    }) => ({
      "PO No.":          r.requestNumber,
      "Order No.":       r.order?.orderNumber ?? "",
      "Type":            r.requestType,
      "Status":          r.status,
      "Est. Amount (₹)": r.estimatedAmount,
      "Raised By":       r.requestedBy?.name ?? "",
      "Date":            r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "",
    }));

    const summary = [
      { "Metric": "Total Orders",      "Value": orders.length },
      { "Metric": "Total Invoices",    "Value": invoices.length },
      { "Metric": "Total POs",         "Value": requests.length },
      { "Metric": "Order Value (₹)",   "Value": totalOrderValue },
      { "Metric": "Est. Cost (₹)",     "Value": totalEstCost },
      { "Metric": "Invoiced (₹)",      "Value": totalInvoiced },
      { "Metric": "Paid (₹)",          "Value": totalPaid },
      { "Metric": "Outstanding (₹)",   "Value": totalInvoiced - totalPaid },
      { "Metric": "Gross Margin (₹)",  "Value": totalOrderValue - totalInvoiced },
    ];

    downloadExcel(
      [
        { name: "Summary",          rows: summary    },
        { name: "Orders",           rows: orderRows  },
        { name: "Purchase Orders",  rows: poRows     },
        { name: "Invoices",         rows: invoiceRows },
      ],
      `Full_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm">Financial overview and analytics</p>
        </div>
        <button
          onClick={exportFullReport}
          className="btn-primary gap-2"
          disabled={orders.length === 0 && invoices.length === 0}
        >
          <FileDown className="w-4 h-4" /> Export Full Report
        </button>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Order Value vs Costs (Last 15 Orders)</h2>
          <button onClick={exportOrdersReport} disabled={orders.length === 0} className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> Export Orders
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={costChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="orderNumber" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Bar dataKey="Order Value" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Est. Cost"   fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Invoiced"    fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Order Status Distribution</h2>
            <button onClick={exportOrdersReport} disabled={orders.length === 0} className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
              <FileDown className="w-3.5 h-3.5" /> Export
            </button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Invoice Payment Status</h2>
            <button onClick={exportInvoicesReport} disabled={invoices.length === 0} className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
              <FileDown className="w-3.5 h-3.5" /> Export Invoices
            </button>
          </div>
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

      {/* Purchase Orders export */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Purchase Orders Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">{requests.length} purchase orders — all statuses</p>
          </div>
          <button onClick={exportPOReport} disabled={requests.length === 0} className="btn-secondary gap-2">
            <FileDown className="w-4 h-4" /> Export POs
          </button>
        </div>
      </div>
    </div>
  );
}
