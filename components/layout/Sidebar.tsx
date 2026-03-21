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

  const filteredItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  const isProduction = role === "PRODUCTION";
  const userInitial = session?.user?.name?.[0]?.toUpperCase() || "U";

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
          collapsed ? "w-14" : "w-64"
        )}
      >
        {/* ── Header ────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border min-h-[56px]">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Activity className="w-4 h-4 text-white" strokeWidth={1.8} />
              </div>
            ) : (
              <Logo size="sm" />
            )}
          </Link>

          {onClose ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>

        {/* ── Production CTA ────────────────────── */}
        {isProduction && (
          <div className={cn("px-2 pt-3", collapsed && "px-1.5")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/requests/new"
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Raise Request</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/requests/new"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Raise Request
              </Link>
            )}
          </div>
        )}

        {/* ── Nav ───────────────────────────────── */}
        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="space-y-0.5">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] flex-shrink-0",
                      isActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50"
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          {role === "ADMIN" && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/settings"
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-center px-0 py-2 rounded-lg text-sm font-medium transition-all",
                        pathname.startsWith("/settings")
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                    >
                      <Settings className="w-[18px] h-[18px]" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href="/settings"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                    pathname.startsWith("/settings")
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Settings className="w-[18px] h-[18px] flex-shrink-0 text-sidebar-foreground/50" />
                  <span>Settings</span>
                </Link>
              )}
            </>
          )}
        </ScrollArea>

        {/* ── User Footer ───────────────────────── */}
        <div className="p-2 border-t border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  {session?.user?.name}
                </div>
                <div className="text-xs text-sidebar-foreground/50 font-medium">
                  {role}
                </div>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
