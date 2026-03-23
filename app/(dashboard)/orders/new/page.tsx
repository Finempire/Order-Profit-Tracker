import { Suspense } from "react";
import { NewOrderContent } from "@/components/orders/NewOrderContent";

export default function NewOrderPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
        <NewOrderContent />
      </Suspense>
    </div>
  );
}
