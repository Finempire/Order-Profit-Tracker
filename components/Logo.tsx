import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const iconSizes = { sm: "w-7 h-7", md: "w-9 h-9", lg: "w-16 h-16" };
  const lucideSizes = { sm: 16, md: 20, lg: 36 };
  const textSizes = { sm: "text-sm", md: "text-base", lg: "text-3xl" };
  const radiusSizes = { sm: "rounded-lg", md: "rounded-xl", lg: "rounded-2xl" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center flex-shrink-0 bg-emerald-500 shadow-sm",
          iconSizes[size],
          radiusSizes[size]
        )}
      >
        <Activity
          size={lucideSizes[size]}
          strokeWidth={1.8}
          className="text-white"
        />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight text-slate-900", textSizes[size])}>
          Order to <span className="text-emerald-600">Profit</span>
        </span>
      )}
    </div>
  );
}
