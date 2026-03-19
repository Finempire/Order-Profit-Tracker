"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, ClipboardList, FileText, CreditCard,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
  { href: "/orders", label: "Orders", icon: Package, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/requests", label: "Requests", icon: ClipboardList, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "CEO", "ACCOUNTANT", "PRODUCTION"] },
  { href: "/payments", label: "Payments", icon: CreditCard, roles: ["ADMIN", "CEO", "ACCOUNTANT"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
          <div className="flex">
            {bottomNavItems
              .filter((item) => !role || item.roles.includes(role))
              .slice(0, 5)
              .map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px]">{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </nav>
      </div>
    </div>
  );
}
