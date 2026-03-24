"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, User, Lock, Bell, Shield, Building2, Users, Plus, Edit2, Key, X } from "lucide-react";

type SettingsTab = "profile" | "password" | "notifications" | "users" | "roles" | "company";
type UserRole = "ADMIN" | "CEO" | "ACCOUNTANT" | "PRODUCTION";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; user: AppUser }
  | { type: "password"; user: AppUser };

const TABS: { key: SettingsTab; label: string; icon: typeof User; adminOnly?: boolean }[] = [
  { key: "profile",       label: "Profile",       icon: User                        },
  { key: "password",      label: "Password",      icon: Lock                        },
  { key: "notifications", label: "Notifications", icon: Bell                        },
  { key: "users",         label: "Users",         icon: Users,    adminOnly: true   },
  { key: "roles",         label: "User Roles",    icon: Shield,   adminOnly: true   },
  { key: "company",       label: "Company",       icon: Building2, adminOnly: true  },
];

const ROLES: UserRole[] = ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"];

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:       "bg-purple-100 text-purple-700",
  CEO:         "bg-blue-100 text-blue-700",
  ACCOUNTANT:  "bg-green-100 text-green-700",
  PRODUCTION:  "bg-amber-100 text-amber-700",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const queryClient = useQueryClient();

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
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "PRODUCTION" as UserRole, password: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "PRODUCTION" as UserRole, isActive: true });
  const [newPwd, setNewPwd] = useState("");

  /* ── Fetch users (admin) ──────────────────────── */
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    enabled: isAdmin && activeTab === "users",
  });
  const users: AppUser[] = usersData?.data?.users || [];

  /* ── Profile mutation ─────────────────────────── */
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

  /* ── Own password mutation ────────────────────── */
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

  /* ── Create user (admin) ──────────────────────── */
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("User created");
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        setModal({ type: "none" });
        setUserForm({ name: "", email: "", role: "PRODUCTION", password: "" });
      } else {
        toast.error(res.error || "Failed to create user");
      }
    },
  });

  /* ── Edit user (admin) ────────────────────────── */
  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("User updated");
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        setModal({ type: "none" });
      } else {
        toast.error(res.error || "Failed to update user");
      }
    },
  });

  /* ── Reset user password (admin) ─────────────── */
  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Password reset. User must change it on next login.");
        setModal({ type: "none" });
        setNewPwd("");
      } else {
        toast.error(res.error || "Failed to reset password");
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

  const openEdit = (u: AppUser) => {
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
    setModal({ type: "edit", user: u });
  };

  const closeModal = () => {
    setModal({ type: "none" });
    setNewPwd("");
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
            {TABS.filter((t) => !t.adminOnly || isAdmin).map((tab) => {
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
                { label: "Request Approved",   sub: "When someone approves your purchase order" },
                { label: "Request Rejected",   sub: "When your request is rejected with a reason" },
                { label: "Invoice Uploaded",   sub: "When a vendor invoice is added to an order" },
                { label: "Payment Recorded",   sub: "When a payment is marked on an invoice" },
                { label: "Cost Overrun Alert", sub: "When invoiced cost exceeds estimated" },
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

          {/* Users — Admin only */}
          {activeTab === "users" && isAdmin && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">User Management</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Add, edit, and manage user access</p>
                </div>
                <button
                  onClick={() => setModal({ type: "add" })}
                  className="btn-primary text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No users found</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate">{u.name}</div>
                          <div className="text-xs text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                          {u.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setNewPwd(""); setModal({ type: "password", user: u }); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          title="Reset password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                { role: "ADMIN",      color: "bg-purple-100 text-purple-700", desc: "Full access: manage users, all orders, all settings" },
                { role: "CEO",        color: "bg-blue-100 text-blue-700",     desc: "Read-only financial dashboards, approve/reject requests" },
                { role: "ACCOUNTANT", color: "bg-green-100 text-green-700",   desc: "Manage invoices, record payments, view financials" },
                { role: "PRODUCTION", color: "bg-amber-100 text-amber-700",   desc: "Raise purchase/expense requests, view own order status" },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${r.color}`}>{r.role}</span>
                  <p className="text-sm text-slate-600">{r.desc}</p>
                </div>
              ))}
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
                { label: "Company Name", placeholder: "Your Manufacturing Ltd." },
                { label: "GSTIN",        placeholder: "22AAAAA0000A1Z5"         },
                { label: "Address",      placeholder: "123 Industrial Area..."  },
                { label: "Phone",        placeholder: "+91 98765 43210"         },
                { label: "Email",        placeholder: "info@company.com"        },
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

      {/* ── Modals ─────────────────────────────────────── */}
      {modal.type !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Add User */}
            {modal.type === "add" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Add New User</h3>
                  <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                    className="form-input"
                    placeholder="John Doe"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    className="form-input"
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <label className="form-label">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                    className="form-input"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                    className="form-input"
                    placeholder="Min. 6 characters"
                  />
                  <p className="text-xs text-slate-400 mt-1">User will be prompted to change on first login.</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button
                    onClick={() => createUserMutation.mutate(userForm)}
                    disabled={createUserMutation.isPending || !userForm.name || !userForm.email || userForm.password.length < 6}
                    className="btn-primary flex-1 justify-center"
                  >
                    {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create User
                  </button>
                </div>
              </div>
            )}

            {/* Edit User */}
            {modal.type === "edit" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Edit User</h3>
                  <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="form-input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                    className="form-input"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Account Status</div>
                    <div className="text-xs text-slate-400">{editForm.isActive ? "User can log in" : "Login is blocked"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, isActive: !p.isActive }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.isActive ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button
                    onClick={() => editUserMutation.mutate({ id: modal.user.id, data: editForm })}
                    disabled={editUserMutation.isPending}
                    className="btn-primary flex-1 justify-center"
                  >
                    {editUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Reset Password */}
            {modal.type === "password" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Reset Password</h3>
                  <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  Setting a new password for{" "}
                  <span className="font-semibold text-slate-900">{modal.user.name}</span>.
                  They will be prompted to change it on next login.
                </p>
                <div>
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="form-input"
                    placeholder="Min. 6 characters"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button
                    onClick={() => resetPwdMutation.mutate({ id: modal.user.id, password: newPwd })}
                    disabled={resetPwdMutation.isPending || newPwd.length < 6}
                    className="btn-primary flex-1 justify-center"
                  >
                    {resetPwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Set Password
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
