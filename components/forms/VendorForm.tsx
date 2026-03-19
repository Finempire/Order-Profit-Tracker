"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { vendorSchema, type VendorFormValues } from "@/lib/validations/vendor";

interface VendorFormProps {
  onSuccess: (vendor: { id: string; name: string; email?: string; phone?: string; address?: string; gstin?: string }) => void;
  onClose: () => void;
}

export function VendorForm({ onSuccess, onClose }: VendorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorFormValues>({ resolver: zodResolver(vendorSchema) });

  const createVendor = useMutation({
    mutationFn: (data: VendorFormValues) =>
      fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Vendor "${res.data.name}" added`);
        onSuccess(res.data);
      } else {
        toast.error(res.error || "Failed to create vendor");
      }
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Add New Vendor</h3>
        <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
      </div>

      <form onSubmit={handleSubmit((data) => createVendor.mutate(data))} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="form-label">Name *</label>
          <input {...register("name")} className="form-input" placeholder="Vendor company name" />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>
        <div>
          <label className="form-label">Email</label>
          <input type="email" {...register("email")} className="form-input" placeholder="vendor@example.com" />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input {...register("phone")} className="form-input" placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="form-label">GSTIN</label>
          <input {...register("gstin")} className="form-input" placeholder="27AADCS0472N1Z1" />
        </div>
        <div>
          <label className="form-label">Address</label>
          <textarea {...register("address")} className="form-input resize-none" rows={3} placeholder="Full address..." />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={createVendor.isPending} className="btn-primary flex-1">
            {createVendor.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Vendor
          </button>
        </div>
      </form>
    </div>
  );
}
