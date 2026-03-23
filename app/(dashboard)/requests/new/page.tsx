import { NewPOContent } from "@/components/requests/NewPOContent";

export default function NewRequestPage() {
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Purchase Order</h1>
          <p className="text-slate-400 text-sm">Fill in the PO details and line items</p>
        </div>
        <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">DRAFT</span>
      </div>
      <NewPOContent />
    </div>
  );
}
