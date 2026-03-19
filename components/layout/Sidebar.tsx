"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Package, Users, Building2, ClipboardList,
  FileText, CreditCard, BarChart3, Settings, LogOut, Factory,
  X, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",        icon: LayoutDashboard, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/orders",     label: "Orders",            icon: Package,         roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/buyers",     label: "Buyers",            icon: Users,           roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/vendors",    label: "Vendors",           icon: Building2,       roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/requests",   label: "Purchase Requests", icon: ClipboardList,   roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/invoices",   label: "Invoices",          icon: FileText,        roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/payments",   label: "Payments",          icon: CreditCard,      roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/reports",    label: "Reports",           icon: BarChart3,       roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const filteredItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  const isProduction = role === "PRODUCTION";

  return (
    <div
      className={`flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 min-h-[60px]">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Factory className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="sidebar-brand-name font-bold text-slate-900 text-sm tracking-tight truncate">
              ManufacturePro
            </span>
          )}
        </Link>
        {onClose ? (
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors hidden lg:flex items-center justify-center"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Production: Raise Request CTA */}
      {isProduction && !collapsed && (
        <div className="px-3 pt-3">
          <Link
            href="/requests/new"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Raise Request
          </Link>
        </div>
      )}
      {isProduction && collapsed && (
        <div className="px-2 pt-3">
          <Link
            href="/requests/new"
            onClick={onClose}
            title="Raise Request"
            className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              {!collapsed && (
                <span className="sidebar-label truncate">{item.label}</span>
              )}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              )}
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <div className="pt-2 mt-2 border-t border-slate-100">
            <Link
              href="/settings"
              onClick={onClose}
              title={collapsed ? "Settings" : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                pathname.startsWith("/settings")
                  ? "bg-blue-50 text-blue-700 border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Settings className="w-[18px] h-[18px] flex-shrink-0 text-slate-400" />
              {!collapsed && <span className="sidebar-label">Settings</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-2 border-t border-slate-100">
        {!collapsed && (
          <div className="user-info flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-400 font-medium">{role}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
