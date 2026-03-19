"use client";

import { Menu, Bell } from "lucide-react";
import { useSession } from "next-auth/react";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="text-sm text-slate-700 font-medium hidden sm:block">{session?.user?.name}</span>
        </div>
      </div>
    </header>
  );
}
