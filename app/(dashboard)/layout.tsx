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
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 w-72 flex flex-col shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
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
                    className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                      isActive ? "text-blue-600" : "text-slate-400"
                    }`}
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
