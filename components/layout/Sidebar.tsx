"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, Package, Users, Building2, ClipboardList,
  FileText, CreditCard, BarChart3, Settings, LogOut,
  X, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  color: string;       // icon accent color class
  activeBg: string;    // active background (light mode)
  activeBgDark: string; // active background (dark mode)
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",        icon: LayoutDashboard, roles: ["ADMIN", "CEO", "ACCOUNTANT"],                color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/orders",    label: "Orders",            icon: Package,         roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],  color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/buyers",    label: "Buyers",            icon: Users,           roles: ["ADMIN", "CEO", "ACCOUNTANT"],                color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/vendors",   label: "Vendors",           icon: Building2,       roles: ["ADMIN", "CEO", "ACCOUNTANT"],                color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/requests",  label: "Purchase Orders",   icon: ClipboardList,   roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],  color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/invoices",  label: "Invoices",          icon: FileText,        roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"],  color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/payments",  label: "Payments",          icon: CreditCard,      roles: ["ADMIN", "CEO", "ACCOUNTANT"],                color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
  { href: "/reports",   label: "Reports",           icon: BarChart3,       roles: ["ADMIN", "CEO", "ACCOUNTANT"],                color: "text-white",  activeBg: "bg-white/20",  activeBgDark: "dark:bg-white/10" },
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

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col h-full border-r transition-all duration-250 ease-in-out",
          collapsed ? "w-[56px]" : "w-60"
        )}
        style={{ background: "#1e6b3c", borderColor: "#185a38" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-3 py-3 min-h-[52px]"
          style={{ borderBottom: "1px solid #185a38" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0 overflow-hidden">
            {collapsed ? (
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-black text-white"
                style={{ background: "#217346", fontSize: "0.7rem", letterSpacing: "-0.05em" }}
              >
                XL
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 font-black text-white"
                  style={{ background: "#2e7d4f", fontSize: "0.65rem", letterSpacing: "-0.05em" }}
                >
                  XL
                </div>
                <span className="text-white font-semibold text-sm truncate">Order Tracker</span>
              </div>
            )}
          </Link>

          {onClose ? (
            <button onClick={onClose} className="h-7 w-7 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all lg:hidden">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="h-7 w-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all hidden lg:flex"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
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
                    className="flex items-center justify-center w-9 h-9 mx-auto rounded text-white transition-all"
                    style={{ background: "#2e7d4f" }}
                  >
                    <Plus className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Raise Request</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/requests/new" onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-2 rounded text-white text-sm font-semibold transition-all"
                style={{ background: "#2e7d4f" }}
              >
                <Plus className="w-4 h-4" /> Raise Request
              </Link>
            )}
          </div>
        )}

        {/* ── Nav ── */}
        <ScrollArea className="flex-1 px-1.5 py-2">
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
                    "relative flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center px-0 w-9 mx-auto"
                  )}
                >
                  {/* Active left border indicator */}
                  {isActive && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r"
                      style={{ background: "rgba(255,255,255,0.85)" }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-[17px] h-[17px] flex-shrink-0 transition-transform duration-150",
                      isActive ? "text-white" : "text-white/55 group-hover:text-white",
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
              <div className="my-2 mx-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/settings" onClick={onClose}
                      className={cn(
                        "flex items-center justify-center w-9 mx-auto py-2 rounded text-sm font-medium transition-all group",
                        pathname.startsWith("/settings")
                          ? "bg-white/20 text-white"
                          : "text-white/55 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Settings className="w-[17px] h-[17px] group-hover:scale-110 transition-transform" strokeWidth={pathname.startsWith("/settings") ? 2.2 : 1.7} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href="/settings" onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all group",
                    pathname.startsWith("/settings")
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Settings className="w-[17px] h-[17px] flex-shrink-0 group-hover:scale-110 transition-transform" strokeWidth={pathname.startsWith("/settings") ? 2.2 : 1.7} />
                  <span>Settings</span>
                </Link>
              )}
            </>
          )}
        </ScrollArea>

        {/* ── User Footer ── */}
        <div className="p-1.5" style={{ borderTop: "1px solid #185a38" }}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded mb-0.5" style={{ background: "rgba(0,0,0,0.15)" }}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-white text-xs font-bold" style={{ background: "#2e7d4f" }}>
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{session?.user?.name}</div>
                <div className="text-[10px] text-white/55 truncate">{role}</div>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center justify-center py-2 rounded text-white/40 hover:bg-red-600/20 hover:text-red-300 transition-all mt-0.5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/40 hover:bg-red-600/20 hover:text-red-300 transition-all mt-0.5"
            >
              <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
