"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, User, Lock, Bell, Shield, Building2 } from "lucide-react";

type SettingsTab = "profile" | "password" | "notifications" | "roles" | "company";

const TABS: { key: SettingsTab; label: string; icon: typeof User }[] = [
  { key: "profile",       label: "Profile",       icon: User      },
  { key: "password",      label: "Password",      icon: Lock      },
  { key: "notifications", label: "Notifications", icon: Bell      },
  { key: "roles",         label: "User Roles",    icon: Shield    },
  { key: "company",       label: "Company",       icon: Building2 },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileForm, setProfileForm] = useState({
    name:  session?.user?.name  || "",
    email: session?.user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  });

  const profileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) toast.success("Profile updated");
      else toast.error(res.error || "Failed to update profile");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Password changed successfully");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(res.error || "Failed to change password");
      }
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your account and application preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.filter((t) => {
              if ((t.key === "roles" || t.key === "company") && !isAdmin) return false;
              return true;
            }).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                    activeTab === tab.key
                      ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                      : "text-slate-600 hover:bg-slate-50 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Panel */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Profile Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update your name and email address</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{session?.user?.name}</div>
                  <div className="text-sm text-slate-400">{session?.user?.email}</div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mt-1">{role}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="form-input"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    className="form-input"
                    placeholder="your@email.com"
                  />
                </div>
                <button
                  onClick={() => profileMutation.mutate(profileForm)}
                  disabled={profileMutation.isPending}
                  className="btn-primary"
                >
                  {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          {activeTab === "password" && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">Use a strong password with at least 6 characters</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Current Password *</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="form-input"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="form-label">Confirm New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="form-input"
                    autoComplete="new-password"
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="form-error">Passwords do not match</p>
                  )}
                </div>
                <button type="submit" disabled={passwordMutation.isPending} className="btn-primary">
                  {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-400 mt-0.5">Control which events you get notified about</p>
              </div>
              {[
                { label: "Request Approved",  sub: "When someone approves your purchase request" },
                { label: "Request Rejected",  sub: "When your request is rejected with a reason" },
                { label: "Invoice Uploaded",  sub: "When a vendor invoice is added to an order" },
                { label: "Payment Recorded",  sub: "When a payment is marked on an invoice" },
                { label: "Cost Overrun Alert",sub: "When invoiced cost exceeds estimated" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.sub}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
              <p className="text-xs text-slate-400">In-app notifications only. Email notifications coming soon.</p>
            </div>
          )}

          {/* Roles — Admin only */}
          {activeTab === "roles" && isAdmin && (
            <div className="card space-y-4">
              <div>
                <h2 className="font-semibold text-slate-900">User Roles Reference</h2>
                <p className="text-xs text-slate-400 mt-0.5">How each role interacts with the application</p>
              </div>
              {[
                { role: "ADMIN",       color: "bg-purple-100 text-purple-700", desc: "Full access: manage users, all orders, all settings" },
                { role: "CEO",         color: "bg-blue-100 text-blue-700",     desc: "Read-only financial dashboards, approve/reject requests" },
                { role: "ACCOUNTANT",  color: "bg-green-100 text-green-700",   desc: "Manage invoices, record payments, view financials" },
                { role: "PRODUCTION",  color: "bg-amber-100 text-amber-700",   desc: "Raise purchase/expense requests, view own order status" },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${r.color}`}>{r.role}</span>
                  <p className="text-sm text-slate-600">{r.desc}</p>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-slate-400">To add or change user roles, manage users through the database or ask your admin to update directly.</p>
              </div>
            </div>
          )}

          {/* Company — Admin only */}
          {activeTab === "company" && isAdmin && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Company Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">Used on invoices and reports</p>
              </div>
              {[
                { label: "Company Name",   placeholder: "Your Manufacturing Ltd." },
                { label: "GSTIN",          placeholder: "22AAAAA0000A1Z5"         },
                { label: "Address",        placeholder: "123 Industrial Area..."  },
                { label: "Phone",          placeholder: "+91 98765 43210"         },
                { label: "Email",          placeholder: "info@company.com"        },
              ].map((f) => (
                <div key={f.label}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" placeholder={f.placeholder} />
                </div>
              ))}
              <button className="btn-primary">Save Company Info</button>
              <p className="text-xs text-slate-400">Company settings saved locally (API integration coming soon).</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
