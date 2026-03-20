"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password changed! Please sign in again.");
        await signOut({ callbackUrl: "/login" });
      } else {
        toast.error(json.error || "Failed to change password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
          <p className="text-slate-500 text-sm mt-1">You must change your password before continuing</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} {...register("currentPassword")} className="form-input pr-10" placeholder="Your current password" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} {...register("newPassword")} className="form-input pr-10" placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <input type="password" {...register("confirmPassword")} className="form-input" placeholder="Repeat new password" />
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary justify-center py-2.5">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing...</> : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
