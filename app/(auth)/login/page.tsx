"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye, EyeOff, Loader2, Activity,
  Package, TrendingUp, DollarSign, ArrowRight, Mail, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface Particle {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  type: "profit" | "trend" | "order";
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 15}s`,
      size: `${16 + Math.random() * 22}px`,
      type:
        Math.random() > 0.6 ? "profit" : Math.random() > 0.3 ? "trend" : "order",
    }));
    setParticles(newParticles);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      <style>{`
        @keyframes flowUpward {
          0%   { transform: translateY(110vh) scale(0.5) rotate(0deg);   opacity: 0; }
          20%  { opacity: 0.22; }
          80%  { opacity: 0.22; }
          100% { transform: translateY(-10vh) scale(1.2) rotate(360deg); opacity: 0; }
        }
        @keyframes drawLine {
          0%   { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.25); }
          50%       { box-shadow: 0 0 40px rgba(16,185,129,0.55); }
        }
        .particle-flow { animation: flowUpward linear infinite; }
        .chart-line {
          stroke-dasharray: 1000;
          animation: drawLine 4s ease-out forwards;
        }
        .logo-pulse { animation: logoGlow 3s ease-in-out infinite; }
      `}</style>

      {/* ── LEFT: Animated Branding ─────────────── */}
      <div className="relative hidden md:flex w-full md:w-3/5 bg-slate-100 items-center justify-center overflow-hidden">
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-emerald-50 z-0" />

        {/* Chart lines */}
        <svg
          className="absolute inset-0 w-full h-full z-0 opacity-25"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,800 Q 200,700 300,500 T 600,400 T 900,100"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            className="chart-line"
          />
          <path
            d="M 0,900 Q 250,800 400,600 T 700,300 T 1000,50"
            fill="none"
            stroke="#047857"
            strokeWidth="2"
            className="chart-line"
            style={{ animationDelay: "1s" }}
          />
        </svg>

        {/* Floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-0 z-0 text-emerald-500/25 particle-flow"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: p.size,
              height: p.size,
            }}
          >
            {p.type === "order"  && <Package   size="100%" />}
            {p.type === "trend"  && <TrendingUp size="100%" />}
            {p.type === "profit" && <DollarSign size="100%" />}
          </div>
        ))}

        {/* Center branding card */}
        <div className="relative z-10 flex flex-col items-center text-center p-10 backdrop-blur-md bg-white/60 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-sm">
          {/* Logo icon */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-emerald-100 rounded-2xl rotate-45 flex items-center justify-center border border-emerald-300/50 logo-pulse">
              <div className="-rotate-45 text-emerald-600">
                <Activity size={48} strokeWidth={1.5} />
              </div>
            </div>
            <Package
              size={20}
              className="absolute -bottom-2 -left-4 text-slate-400 animate-pulse"
            />
            <TrendingUp
              size={24}
              className="absolute top-1/2 -right-6 text-emerald-500 animate-bounce"
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
            Order to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600">
              Profit
            </span>
          </h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Real-time analytics to transform your daily orders into measurable growth.
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login Form ───────────────────── */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-8 bg-white shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center mb-2">
            <Logo size="md" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to track your real-time profit margins.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-[0_4px_14px_0_rgba(16,185,129,0.35)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in to Dashboard
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
              {isLoading && "Signing in..."}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 pt-2">
            Order to Profit &bull; © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
