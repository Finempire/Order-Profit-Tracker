"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, Users, Building2, ClipboardList,
  FileText, CreditCard, BarChart3, Settings, LogOut, Factory, X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/orders", label: "Orders", icon: Package, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/buyers", label: "Buyers", icon: Users, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/vendors", label: "Vendors", icon: Building2, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/requests", label: "Purchase Requests", icon: ClipboardList, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/payments", label: "Payments", icon: CreditCard, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const filteredItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Factory className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">ManufacturePro</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <div className="pt-2 mt-2 border-t border-slate-100">
            <Link
              href="/settings"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/settings")
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4 flex-shrink-0 text-slate-400" />
              Settings
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</div>
            <div className="text-xs text-slate-400">{role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
