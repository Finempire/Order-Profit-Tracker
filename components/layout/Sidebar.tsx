"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, Package, Users, Building2, ClipboardList,
  FileText, CreditCard, BarChart3, Settings, LogOut,
  X, ChevronLeft, ChevronRight, Plus, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  color: string;       // icon accent color class
  activeBg: string;    // active background
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",        icon: LayoutDashboard, roles: ["ADMIN", "CEO", "ACCOUNTANT"],                          color: "text-violet-500",  activeBg: "bg-violet-50" },
  { href: "/orders",    label: "Orders",            icon: Package,         roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],             color: "text-blue-500",    activeBg: "bg-blue-50" },
  { href: "/buyers",    label: "Buyers",            icon: Users,           roles: ["ADMIN", "CEO", "ACCOUNTANT"],                          color: "text-emerald-500", activeBg: "bg-emerald-50" },
  { href: "/vendors",   label: "Vendors",           icon: Building2,       roles: ["ADMIN", "CEO", "ACCOUNTANT"],                          color: "text-teal-500",    activeBg: "bg-teal-50" },
  { href: "/requests",  label: "Purchase Requests", icon: ClipboardList,   roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],             color: "text-amber-500",   activeBg: "bg-amber-50" },
  { href: "/invoices",  label: "Invoices",          icon: FileText,        roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],             color: "text-orange-500",  activeBg: "bg-orange-50" },
  { href: "/payments",  label: "Payments",          icon: CreditCard,      roles: ["ADMIN", "CEO", "ACCOUNTANT"],                          color: "text-green-500",   activeBg: "bg-green-50" },
  { href: "/reports",   label: "Reports",           icon: BarChart3,       roles: ["ADMIN", "CEO", "ACCOUNTANT"],                          color: "text-rose-500",    activeBg: "bg-rose-50" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const filteredItems = navItems.filter((item) => !role || item.roles.includes(role));
  const isProduction = role === "PRODUCTION";
  const userInitial  = session?.user?.name?.[0]?.toUpperCase() || "U";

  const roleColors: Record<string, string> = {
    ADMIN:      "bg-violet-100 text-violet-700",
    CEO:        "bg-blue-100 text-blue-700",
    ACCOUNTANT: "bg-emerald-100 text-emerald-700",
    PRODUCTION: "bg-amber-100 text-amber-700",
  };
  const roleBadge = role ? roleColors[role] || "bg-slate-100 text-slate-600" : "";

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col h-full bg-white border-r border-slate-100 transition-all duration-250 ease-in-out",
          collapsed ? "w-[60px]" : "w-64"
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-slate-100 min-h-[57px]">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            {collapsed ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200">
                <Activity className="w-4 h-4 text-white" strokeWidth={1.8} />
              </div>
            ) : (
              <Logo size="sm" />
            )}
          </Link>

          {onClose ? (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-400 hover:text-slate-700 lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost" size="icon"
              onClick={toggleCollapsed}
              className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 hidden lg:flex rounded-lg transition-all"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>

        {/* ── Production CTA ── */}
        {isProduction && (
          <div className={cn("px-2 pt-3", collapsed && "px-1.5")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/requests/new" onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200"
                  >
                    <Plus className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Raise Request</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/requests/new" onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200/50"
              >
                <Plus className="w-4 h-4" /> Raise Request
              </Link>
            )}
          </div>
        )}

        {/* ── Nav ── */}
        <ScrollArea className="flex-1 px-2 py-2.5">
          <nav className="space-y-0.5">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkEl = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? cn(item.activeBg, "text-slate-900 font-semibold shadow-sm")
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    collapsed && "justify-center px-0 w-10 mx-auto"
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                      style={{ background: "currentColor", opacity: 0.4 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200",
                      isActive ? item.color : "text-slate-400 group-hover:text-slate-600",
                      "group-hover:scale-110"
                    )}
                    strokeWidth={isActive ? 2.2 : 1.7}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return linkEl;
            })}
          </nav>

          {/* Settings (admin) */}
          {role === "ADMIN" && (
            <>
              <Separator className="my-2.5 bg-slate-100" />
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/settings" onClick={onClose}
                      className={cn(
                        "flex items-center justify-center w-10 mx-auto py-2.5 rounded-xl text-sm font-medium transition-all group",
                        pathname.startsWith("/settings")
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                      )}
                    >
                      <Settings className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" strokeWidth={pathname.startsWith("/settings") ? 2.2 : 1.7} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href="/settings" onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    pathname.startsWith("/settings")
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Settings className="w-[18px] h-[18px] flex-shrink-0 group-hover:scale-110 transition-transform" strokeWidth={pathname.startsWith("/settings") ? 2.2 : 1.7} />
                  <span>Settings</span>
                </Link>
              )}
            </>
          )}
        </ScrollArea>

        {/* ── User Footer ── */}
        <div className="p-2 pt-0 border-t border-slate-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-0.5 bg-slate-50">
              <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{session?.user?.name}</div>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", roleBadge)}>{role}</span>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center justify-center py-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all mt-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all mt-1"
            >
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
