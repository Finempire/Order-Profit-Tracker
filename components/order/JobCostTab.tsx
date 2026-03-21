"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus, Loader2, Save, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaterialEntry {
  id: string; materialName: string; qty: number; unitCost: number;
  valuationMethod: string; totalCost: number;
}
interface LabourEntry {
  id: string; workerName: string; method: string;
  hours: number | null; ratePerHour: number | null;
  units: number | null; ratePerUnit: number | null;
  totalCost: number;
}
interface OverheadEntry {
  id: string; name: string; type: string;
  totalAmount: number; apportionmentBasis: string; orderShare: number;
}
interface Sheet {
  id: string; unitsProduced: number; standardCost: number; budgetedRevenue: number;
  targetPrice: number | null; desiredProfit: number | null;
  materials: MaterialEntry[]; labour: LabourEntry[]; overheads: OverheadEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function VarChip({ value, label }: { value: number; label: string }) {
  const good = value >= 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${good ? "text-emerald-600" : "text-red-600"}`}>
        <Icon className="w-3.5 h-3.5" />
        {value >= 0 ? "+" : ""}{formatCurrency(value)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JobCostTab({ orderId, orderValue }: { orderId: string; orderValue: number }) {
  const qk = ["job-cost-sheet", orderId];
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Sheet }>({
    queryKey: qk,
    queryFn: () => fetch(`/api/orders/${orderId}/job-cost-sheet`).then((r) => r.json()),
  });

  const sheet = data?.data;

  // ── Settings state ─────────────────────────────────────────────────────────
  const [editSettings, setEditSettings] = useState(false);
  const [settings, setSettings] = useState({ unitsProduced: 0, standardCost: 0, budgetedRevenue: 0, targetPrice: "", desiredProfit: "" });

  const saveSettings = useMutation({
    mutationFn: () => fetch(`/api/orders/${orderId}/job-cost-sheet`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitsProduced:   settings.unitsProduced,
        standardCost:    settings.standardCost,
        budgetedRevenue: settings.budgetedRevenue,
        targetPrice:     settings.targetPrice !== "" ? Number(settings.targetPrice) : null,
        desiredProfit:   settings.desiredProfit !== "" ? Number(settings.desiredProfit) : null,
      }),
    }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: qk }); setEditSettings(false); }
      else toast.error(res.error);
    },
  });

  // ── Material state ─────────────────────────────────────────────────────────
  const [showMatForm, setShowMatForm] = useState(false);
  const [matForm, setMatForm] = useState({ materialName: "", qty: "", unitCost: "", valuationMethod: "FIFO" });
  const addMaterial = useMutation({
    mutationFn: () => fetch(`/api/orders/${orderId}/materials`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...matForm, qty: Number(matForm.qty), unitCost: Number(matForm.unitCost) }),
    }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Material added"); qc.invalidateQueries({ queryKey: qk });
        setMatForm({ materialName: "", qty: "", unitCost: "", valuationMethod: "FIFO" }); setShowMatForm(false);
      } else toast.error(res.error);
    },
  });
  const deleteMaterial = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${orderId}/materials/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: qk }); },
  });

  // ── Labour state ───────────────────────────────────────────────────────────
  const [showLabForm, setShowLabForm] = useState(false);
  const [labForm, setLabForm] = useState({ workerName: "", method: "TIME_RATE", hours: "", ratePerHour: "", units: "", ratePerUnit: "" });
  const addLabour = useMutation({
    mutationFn: () => fetch(`/api/orders/${orderId}/labour`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(labForm),
    }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Labour entry added"); qc.invalidateQueries({ queryKey: qk });
        setLabForm({ workerName: "", method: "TIME_RATE", hours: "", ratePerHour: "", units: "", ratePerUnit: "" }); setShowLabForm(false);
      } else toast.error(res.error);
    },
  });
  const deleteLabour = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${orderId}/labour/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: qk }); },
  });

  // ── Overhead state ─────────────────────────────────────────────────────────
  const [showOhForm, setShowOhForm] = useState(false);
  const [ohForm, setOhForm] = useState({ name: "", type: "FIXED", totalAmount: "", apportionmentBasis: "MANUAL", orderShare: "" });
  const addOverhead = useMutation({
    mutationFn: () => fetch(`/api/orders/${orderId}/overheads`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ohForm, totalAmount: Number(ohForm.totalAmount), orderShare: Number(ohForm.orderShare) }),
    }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Overhead added"); qc.invalidateQueries({ queryKey: qk });
        setOhForm({ name: "", type: "FIXED", totalAmount: "", apportionmentBasis: "MANUAL", orderShare: "" }); setShowOhForm(false);
      } else toast.error(res.error);
    },
  });
  const deleteOverhead = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${orderId}/overheads/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: qk }); },
  });

  if (isLoading) return <div className="py-12 text-center text-slate-400 text-sm">Loading job cost sheet...</div>;
  if (!sheet) return null;

  // ── Calculations ───────────────────────────────────────────────────────────
  const totalMaterials = sheet.materials.reduce((s, m) => s + m.totalCost, 0);
  const totalLabour    = sheet.labour.reduce((s, l) => s + l.totalCost, 0);
  const totalOverheads = sheet.overheads.reduce((s, o) => s + o.orderShare, 0);
  const totalActualCost = totalMaterials + totalLabour + totalOverheads;
  const unitCost = sheet.unitsProduced > 0 ? totalActualCost / sheet.unitsProduced : 0;

  // Standard costing variance
  const standardCost    = sheet.standardCost;
  const budgetedRevenue = sheet.budgetedRevenue;
  const budgetedProfit  = budgetedRevenue - standardCost;
  const actualProfit    = orderValue - totalActualCost;
  const profitVariance  = actualProfit - budgetedProfit;
  const costVariance    = standardCost - totalActualCost; // positive = saved, negative = over
  const revenueVariance = orderValue - budgetedRevenue;

  // Target costing
  const hasTarget = sheet.targetPrice != null && sheet.desiredProfit != null;
  const targetCost = hasTarget ? (sheet.targetPrice! - sheet.desiredProfit!) : null;
  const targetGap  = hasTarget ? totalActualCost - targetCost! : null;

  return (
    <div className="space-y-5">

      {/* ── Settings Card ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Job Cost Sheet Settings</h3>
          {editSettings ? (
            <div className="flex gap-2">
              <button onClick={() => setEditSettings(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="btn-primary text-xs">
                {saveSettings.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSettings({
                  unitsProduced: sheet.unitsProduced, standardCost: sheet.standardCost,
                  budgetedRevenue: sheet.budgetedRevenue,
                  targetPrice: sheet.targetPrice != null ? String(sheet.targetPrice) : "",
                  desiredProfit: sheet.desiredProfit != null ? String(sheet.desiredProfit) : "",
                });
                setEditSettings(true);
              }}
              className="btn-secondary text-xs"
            >
              Edit Settings
            </button>
          )}
        </div>

        {editSettings ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Units Produced", key: "unitsProduced", help: "Total units produced in this batch" },
              { label: "Standard (Budgeted) Cost ₹", key: "standardCost", help: "Total planned cost for this order" },
              { label: "Budgeted Revenue ₹", key: "budgetedRevenue", help: "Expected selling value" },
              { label: "Target Market Price ₹", key: "targetPrice", help: "Competitive market price (target costing)" },
              { label: "Desired Profit ₹", key: "desiredProfit", help: "Profit you want to achieve" },
            ].map(({ label, key, help }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={(settings as Record<string, string | number>)[key]}
                  onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                  className="form-input"
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-400 mt-0.5">{help}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Units Produced",  value: sheet.unitsProduced, isCurrency: false },
              { label: "Standard Cost",   value: sheet.standardCost,  isCurrency: true },
              { label: "Budgeted Revenue",value: sheet.budgetedRevenue, isCurrency: true },
              { label: "Target Price",    value: sheet.targetPrice,    isCurrency: true },
              { label: "Desired Profit",  value: sheet.desiredProfit,  isCurrency: true },
            ].map(({ label, value, isCurrency }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {value != null
                    ? isCurrency ? formatCurrency(value) : value
                    : <span className="text-slate-300 font-normal text-sm">Not set</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Real-Time Unit Cost Bar ────────────────────────────────────────── */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: "Materials",     value: totalMaterials,   color: "text-orange-600" },
            { label: "Labour",        value: totalLabour,      color: "text-purple-600" },
            { label: "Overheads",     value: totalOverheads,   color: "text-rose-600" },
            { label: "Total Cost",    value: totalActualCost,  color: "text-slate-900" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-lg font-bold tabular-nums ${color}`}>{formatCurrency(value)}</div>
            </div>
          ))}
        </div>
        {sheet.unitsProduced > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200 text-center">
            <span className="text-xs text-slate-500">Cost per Unit: </span>
            <span className="text-lg font-bold text-blue-700 tabular-nums">{formatCurrency(unitCost)}</span>
            <span className="text-xs text-slate-400 ml-2">({sheet.unitsProduced} units)</span>
          </div>
        )}
      </div>

      {/* ── Materials Table ────────────────────────────────────────────────── */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Direct Materials</h3>
            <p className="text-xs text-slate-400 mt-0.5">Track material costs using FIFO or LIFO valuation</p>
          </div>
          <button onClick={() => setShowMatForm(!showMatForm)} className="btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Material
          </button>
        </div>

        {showMatForm && (
          <div className="px-5 py-4 bg-orange-50 border-b border-orange-100">
            <div className="grid sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="form-label text-xs">Material Name *</label>
                <input value={matForm.materialName} onChange={(e) => setMatForm((p) => ({ ...p, materialName: e.target.value }))} className="form-input text-sm" placeholder="e.g. Cotton Yarn" />
              </div>
              <div>
                <label className="form-label text-xs">Qty *</label>
                <input type="number" step="0.01" value={matForm.qty} onChange={(e) => setMatForm((p) => ({ ...p, qty: e.target.value }))} className="form-input text-sm" placeholder="0" />
              </div>
              <div>
                <label className="form-label text-xs">Unit Cost (₹) *</label>
                <input type="number" step="0.01" value={matForm.unitCost} onChange={(e) => setMatForm((p) => ({ ...p, unitCost: e.target.value }))} className="form-input text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label text-xs">Valuation</label>
                <select value={matForm.valuationMethod} onChange={(e) => setMatForm((p) => ({ ...p, valuationMethod: e.target.value }))} className="form-input text-sm">
                  <option value="FIFO">FIFO — First In, First Out</option>
                  <option value="LIFO">LIFO — Last In, First Out</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Line Total: <strong>{formatCurrency((Number(matForm.qty) || 0) * (Number(matForm.unitCost) || 0))}</strong></span>
              <div className="flex-1" />
              <button onClick={() => setShowMatForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => addMaterial.mutate()} disabled={addMaterial.isPending || !matForm.materialName} className="btn-primary text-xs">
                {addMaterial.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Add
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper border-none rounded-none">
          <table className="data-table">
            <thead><tr><th>Material</th><th>Valuation</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th /></tr></thead>
            <tbody>
              {sheet.materials.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">No materials logged yet</td></tr>
              )}
              {sheet.materials.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.materialName}</td>
                  <td><span className={`badge ${m.valuationMethod === "FIFO" ? "badge-provisional" : "badge-tax"}`}>{m.valuationMethod}</span></td>
                  <td>{m.qty}</td>
                  <td className="num">{formatCurrency(m.unitCost)}</td>
                  <td className="num font-semibold">{formatCurrency(m.totalCost)}</td>
                  <td>
                    <button onClick={() => deleteMaterial.mutate(m.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sheet.materials.length > 0 && (
                <tr className="bg-orange-50">
                  <td colSpan={4} className="text-right text-sm font-semibold text-slate-700 pr-4">Total Materials</td>
                  <td className="num font-bold text-orange-700">{formatCurrency(totalMaterials)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Labour Table ───────────────────────────────────────────────────── */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Labour Costs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Time Rate (hrs × rate) or Piece Rate (units × rate)</p>
          </div>
          <button onClick={() => setShowLabForm(!showLabForm)} className="btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Labour
          </button>
        </div>

        {showLabForm && (
          <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="form-label text-xs">Worker / Team *</label>
                <input value={labForm.workerName} onChange={(e) => setLabForm((p) => ({ ...p, workerName: e.target.value }))} className="form-input text-sm" placeholder="e.g. Cutting Team" />
              </div>
              <div>
                <label className="form-label text-xs">Method</label>
                <select value={labForm.method} onChange={(e) => setLabForm((p) => ({ ...p, method: e.target.value }))} className="form-input text-sm">
                  <option value="TIME_RATE">Time Rate — Hours × Rate/hr</option>
                  <option value="PIECE_RATE">Piece Rate — Units × Rate/unit</option>
                </select>
              </div>
              {labForm.method === "TIME_RATE" ? (
                <>
                  <div>
                    <label className="form-label text-xs">Hours Worked</label>
                    <input type="number" step="0.5" value={labForm.hours} onChange={(e) => setLabForm((p) => ({ ...p, hours: e.target.value }))} className="form-input text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Rate per Hour (₹)</label>
                    <input type="number" step="0.01" value={labForm.ratePerHour} onChange={(e) => setLabForm((p) => ({ ...p, ratePerHour: e.target.value }))} className="form-input text-sm" placeholder="0.00" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="form-label text-xs">Units Produced</label>
                    <input type="number" step="0.01" value={labForm.units} onChange={(e) => setLabForm((p) => ({ ...p, units: e.target.value }))} className="form-input text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Rate per Unit (₹)</label>
                    <input type="number" step="0.01" value={labForm.ratePerUnit} onChange={(e) => setLabForm((p) => ({ ...p, ratePerUnit: e.target.value }))} className="form-input text-sm" placeholder="0.00" />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Line Total: <strong>{formatCurrency(
                  labForm.method === "TIME_RATE"
                    ? (Number(labForm.hours) || 0) * (Number(labForm.ratePerHour) || 0)
                    : (Number(labForm.units) || 0) * (Number(labForm.ratePerUnit) || 0)
                )}</strong>
              </span>
              <div className="flex-1" />
              <button onClick={() => setShowLabForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => addLabour.mutate()} disabled={addLabour.isPending || !labForm.workerName} className="btn-primary text-xs">
                {addLabour.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Add
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper border-none rounded-none">
          <table className="data-table">
            <thead><tr><th>Worker / Team</th><th>Method</th><th>Basis</th><th>Rate</th><th>Total Cost</th><th /></tr></thead>
            <tbody>
              {sheet.labour.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">No labour entries yet</td></tr>
              )}
              {sheet.labour.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium">{l.workerName}</td>
                  <td><span className={`badge ${l.method === "TIME_RATE" ? "badge-provisional" : "badge-tax"}`}>{l.method === "TIME_RATE" ? "Time Rate" : "Piece Rate"}</span></td>
                  <td className="text-sm text-slate-500">
                    {l.method === "TIME_RATE"
                      ? `${l.hours ?? 0} hrs`
                      : `${l.units ?? 0} units`}
                  </td>
                  <td className="num">
                    {l.method === "TIME_RATE"
                      ? formatCurrency(l.ratePerHour ?? 0) + "/hr"
                      : formatCurrency(l.ratePerUnit ?? 0) + "/unit"}
                  </td>
                  <td className="num font-semibold">{formatCurrency(l.totalCost)}</td>
                  <td>
                    <button onClick={() => deleteLabour.mutate(l.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sheet.labour.length > 0 && (
                <tr className="bg-purple-50">
                  <td colSpan={4} className="text-right text-sm font-semibold text-slate-700 pr-4">Total Labour</td>
                  <td className="num font-bold text-purple-700">{formatCurrency(totalLabour)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Overheads Table ────────────────────────────────────────────────── */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Overhead Apportionment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Fixed (rent, depreciation) and Variable (utilities, power) overheads apportioned to this order</p>
          </div>
          <button onClick={() => setShowOhForm(!showOhForm)} className="btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Overhead
          </button>
        </div>

        {showOhForm && (
          <div className="px-5 py-4 bg-rose-50 border-b border-rose-100">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="form-label text-xs">Overhead Name *</label>
                <input value={ohForm.name} onChange={(e) => setOhForm((p) => ({ ...p, name: e.target.value }))} className="form-input text-sm" placeholder="e.g. Factory Rent" />
              </div>
              <div>
                <label className="form-label text-xs">Type</label>
                <select value={ohForm.type} onChange={(e) => setOhForm((p) => ({ ...p, type: e.target.value }))} className="form-input text-sm">
                  <option value="FIXED">Fixed (Rent, Depreciation…)</option>
                  <option value="VARIABLE">Variable (Electricity, Power…)</option>
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Total Overhead (₹)</label>
                <input type="number" step="0.01" value={ohForm.totalAmount} onChange={(e) => setOhForm((p) => ({ ...p, totalAmount: e.target.value }))} className="form-input text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label text-xs">Apportionment Basis</label>
                <select value={ohForm.apportionmentBasis} onChange={(e) => setOhForm((p) => ({ ...p, apportionmentBasis: e.target.value }))} className="form-input text-sm">
                  <option value="MANUAL">Manual (enter share directly)</option>
                  <option value="FLOOR_SPACE">Floor Space</option>
                  <option value="MACHINE_HOURS">Machine Hours</option>
                  <option value="DIRECT_LABOUR">Direct Labour Hours</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="form-label text-xs">Order&apos;s Share (₹) *</label>
                <input type="number" step="0.01" value={ohForm.orderShare} onChange={(e) => setOhForm((p) => ({ ...p, orderShare: e.target.value }))} className="form-input text-sm" placeholder="0.00" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1" />
              <button onClick={() => setShowOhForm(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => addOverhead.mutate()} disabled={addOverhead.isPending || !ohForm.name} className="btn-primary text-xs">
                {addOverhead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Add
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper border-none rounded-none">
          <table className="data-table">
            <thead><tr><th>Overhead</th><th>Type</th><th>Basis</th><th>Total Pool</th><th>Order&apos;s Share</th><th /></tr></thead>
            <tbody>
              {sheet.overheads.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">No overhead entries yet</td></tr>
              )}
              {sheet.overheads.map((o) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.name}</td>
                  <td><span className={`badge ${o.type === "FIXED" ? "badge-unpaid" : "badge-partial"}`}>{o.type}</span></td>
                  <td className="text-sm text-slate-500">{o.apportionmentBasis.replace("_", " ")}</td>
                  <td className="num">{formatCurrency(o.totalAmount)}</td>
                  <td className="num font-semibold">{formatCurrency(o.orderShare)}</td>
                  <td>
                    <button onClick={() => deleteOverhead.mutate(o.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sheet.overheads.length > 0 && (
                <tr className="bg-rose-50">
                  <td colSpan={4} className="text-right text-sm font-semibold text-slate-700 pr-4">Total Overheads</td>
                  <td className="num font-bold text-rose-700">{formatCurrency(totalOverheads)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Variance Analysis ──────────────────────────────────────────────── */}
      {(sheet.standardCost > 0 || sheet.budgetedRevenue > 0) && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Profit Reconciliation */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Profit Reconciliation
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Order Value (Actual Revenue)</span>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(orderValue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total Actual Cost</span>
                <span className="text-sm font-semibold tabular-nums text-red-600">− {formatCurrency(totalActualCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 font-semibold">
                <span className="text-sm text-slate-700">Actual Gross Profit</span>
                <span className={`text-sm tabular-nums ${actualProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatCurrency(actualProfit)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 mt-2">
                <span className="text-sm text-slate-500">Budgeted Profit</span>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(budgetedProfit)}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 rounded-lg px-3 mt-2">
                <span className="text-sm font-bold text-slate-800">Profit Variance</span>
                <span className={`text-base font-bold tabular-nums ${profitVariance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {profitVariance >= 0 ? "+" : ""}{formatCurrency(profitVariance)}
                </span>
              </div>
            </div>
          </div>

          {/* Variance Breakdown */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Variance Breakdown
            </h3>
            <VarChip value={revenueVariance} label="Sales Price / Revenue Variance" />
            <VarChip value={costVariance} label="Cost Variance (Budget − Actual)" />
            <VarChip value={totalMaterials > 0 ? (totalMaterials * -1) : 0} label="Material Cost Impact" />
            <VarChip value={totalLabour > 0 ? (totalLabour * -1) : 0} label="Labour Cost Impact" />
            <VarChip value={totalOverheads > 0 ? (totalOverheads * -1) : 0} label="Overhead Cost Impact" />
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-400 mb-1">Net Profit Margin</div>
              <div className={`text-xl font-bold ${actualProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {orderValue > 0 ? ((actualProfit / orderValue) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Target Costing ─────────────────────────────────────────────────── */}
      {hasTarget && targetCost != null && targetGap != null && (
        <div className="card border-2 border-dashed border-blue-200 bg-blue-50/40">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Target Costing Analysis</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 border border-blue-100">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Market Price</div>
              <div className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(sheet.targetPrice!)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-blue-100">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Target Cost <span className="normal-case">(Price − Profit)</span></div>
              <div className="text-xl font-bold text-blue-700 tabular-nums">{formatCurrency(targetCost)}</div>
            </div>
            <div className={`rounded-xl p-4 border ${targetGap > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Target Gap <span className="normal-case">(Actual − Target)</span>
              </div>
              <div className={`text-xl font-bold tabular-nums ${targetGap > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {targetGap >= 0 ? "+" : ""}{formatCurrency(targetGap)}
              </div>
            </div>
          </div>
          {targetGap > 0 ? (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2.5 border border-red-200">
              ⚠️ Your actual cost exceeds the target by <strong>{formatCurrency(targetGap)}</strong>. Identify and eliminate non-value-adding costs to close this gap.
            </p>
          ) : (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2.5 border border-emerald-200">
              ✅ Actual cost is <strong>{formatCurrency(Math.abs(targetGap))}</strong> below the target cost — your desired profit is achievable.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
