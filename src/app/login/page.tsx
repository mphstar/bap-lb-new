"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Eye,
  EyeOff,
  TrendingUp,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok dengan password.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: "/dashboard",
        });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 items-center justify-center p-4 md:p-6 lg:p-8 transition-colors duration-300">
      {/* Outer Card Wrapper - Flat, border-only version on white screen background */}
      <div className="w-full max-w-6xl min-h-[600px] lg:min-h-[700px] grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300">

        {/* Left Side: Auth Form */}
        <div className="lg:col-span-6 p-8 sm:p-10 md:p-14 flex flex-col justify-between bg-white dark:bg-slate-900/10">

          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 select-none">
            {/* SVG Logo matching the hexagonal flower style in the screenshot */}
            <svg
              viewBox="0 0 24 24"
              className="size-7 text-blue-600 dark:text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2a3 3 0 0 0-3 3c0 2 3 3 3 3s3-1 3-3a3 3 0 0 0-3-3Z" />
              <path d="M12 22a3 3 0 0 0 3-3c0-2-3-3-3-3s-3 1-3 3a3 3 0 0 0 3 3Z" />
              <path d="M20 8.5a3 3 0 0 0-4.1-.5c-1.6 1.1-1.3 4.1-1.3 4.1s2.8 1.1 4.1-.5a3 3 0 0 0 1.3-3.1Z" />
              <path d="M4 15.5a3 3 0 0 0 4.1.5c1.6-1.1 1.3-4.1 1.3-4.1s-2.8-1.1-4.1.5a3 3 0 0 0-1.3 3.1Z" />
              <path d="M20 15.5a3 3 0 0 0-1.3-3.1c-1.3-1.6-4.1-.5-4.1-.5s-.3 3 1.3 4.1a3 3 0 0 0 4.1-.5Z" />
              <path d="M4 8.5a3 3 0 0 0 1.3 3.1c1.3 1.6 4.1.5 4.1.5s.3-3-1.3-4.1a3 3 0 0 0-4.1.5Z" />
            </svg>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              BAP System
            </span>
          </div>

          {/* Form Content */}
          <div className="my-auto py-8 max-w-md w-full mx-auto space-y-6">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isSignUp ? "Create an Account" : "Sign In to Your Account"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isSignUp
                  ? "Join now to streamline your experience from day one."
                  : "Sign in to access your BAP dashboard and manage schedules."}
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl bg-red-500/5 border-red-500/10">
                <AlertDescription className="text-xs font-semibold text-red-800 dark:text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Roger Gerard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm bg-background w-full focus-visible:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email
                  {isSignUp && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sellostore@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm bg-background w-full focus-visible:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                  {isSignUp && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 pr-10 pl-3.5 py-2.5 text-sm bg-background w-full focus-visible:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 pr-10 pl-3.5 py-2.5 text-sm bg-background w-full focus-visible:ring-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all mt-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                <span>{isSignUp ? "Register" : "Sign In"}</span>
              </Button>
            </form>

            {/* Toggle Switch */}
            <div className="text-center pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 font-semibold cursor-pointer hover:underline"
              >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="text-blue-600 dark:text-blue-400 font-bold">Sign In</span>
                  </>
                ) : (
                  <>
                    Don't have an account? <span className="text-blue-600 dark:text-blue-400 font-bold">Sign Up</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Text */}
          <div className="flex justify-between items-center text-xs text-slate-400 font-medium select-none pt-4 border-t border-slate-100 dark:border-slate-800">
            <span>© 2026 Mphstar❤️. All rights reserved.</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
          </div>
        </div>

        {/* Right Side: Showcase Box with Vector Mockup */}
        <div className="lg:col-span-6 p-6 hidden lg:flex bg-slate-50 dark:bg-slate-900/20 border-l border-slate-100 dark:border-slate-800/80 items-center justify-center">
          <div className="w-full h-full bg-blue-600 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden select-none shadow-inner">
            {/* Visual Shapes Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 border-4 border-white/5 rounded-full blur-sm" />
            <div className="absolute left-10 bottom-1/3 w-24 h-24 border border-white/5 rounded-full" />

            <div className="space-y-2.5 relative z-10 text-white">
              <h3 className="text-3xl font-extrabold leading-tight tracking-tight">
                Effortlessly manage your team and operations.
              </h3>
              <p className="text-sm text-blue-100 font-medium opacity-90 leading-relaxed">
                Log in to access your CRM dashboard and manage your team.
              </p>
            </div>

            {/* CSS Rendered Vector Dashboard Mockup (Flat border version) */}
            <div className="relative z-10 w-[90%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 mr-auto translate-y-4 scale-95 hover:translate-y-2 transition-transform duration-500">

              {/* Header of Mockup */}
              <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-red-400" />
                  <div className="size-2 rounded-full bg-yellow-400" />
                  <div className="size-2 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border dark:border-slate-700/50 text-[9px] text-slate-700 dark:text-slate-300">
                  <span>Monthly</span>
                  <ChevronDown className="size-2.5" />
                </div>
              </div>

              {/* Grid content of Mockup: 3 metrics stats */}
              <div className="grid grid-cols-3 gap-2.5 pt-3.5">
                {/* Stats 1 */}
                <div className="bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Sales</span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">$189,374</span>
                  <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="size-2" /> +12.5%
                  </span>
                </div>

                {/* Stats 2 */}
                <div className="bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Avg Resolution</span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">00:01:30</span>
                  <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="size-2" /> +4.2%
                  </span>
                </div>

                {/* Stats 3 */}
                <div className="bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Profit</span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">$25,684</span>
                  <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="size-2" /> +8.9%
                  </span>
                </div>
              </div>

              {/* Line Chart Wave section */}
              <div className="pt-4">
                <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Performance Overview</span>
                <svg viewBox="0 0 300 90" className="w-full h-20 mt-1">
                  <defs>
                    <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="15" x2="300" y2="15" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                  <line x1="0" y1="45" x2="300" y2="45" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                  <line x1="0" y1="75" x2="300" y2="75" stroke="#f1f5f9" strokeDasharray="3 3" className="dark:stroke-slate-800" />

                  {/* Chart Path Area */}
                  <path
                    d="M0,75 Q40,25 90,65 T200,15 T300,55 L300,90 L0,90 Z"
                    fill="url(#chartGlow)"
                  />
                  {/* Chart Path Stroke */}
                  <path
                    d="M0,75 Q40,25 90,65 T200,15 T300,55"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Interactive Nodes */}
                  <circle cx="90" cy="65" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" className="dark:stroke-slate-900" />
                  <circle cx="200" cy="15" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" className="dark:stroke-slate-900" />
                </svg>
              </div>

              {/* Product Transaction Table */}
              <div className="pt-3.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[8.5px] font-bold text-slate-800 dark:text-slate-200">Product Transaction</span>
                  <span className="text-[7.5px] text-slate-400 hover:underline cursor-pointer">View All</span>
                </div>
                <div className="space-y-1.5">
                  {/* Table Row 1 */}
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-[8.5px]">
                    <div className="flex items-center gap-2">
                      <div className="size-4.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 font-extrabold flex items-center justify-center text-[7.5px]">SP</div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Sellora Pro</span>
                    </div>
                    <span className="text-slate-400">12 Feb 2026</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">$120.00</span>
                    <span className="bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-extrabold text-[7px] flex items-center gap-0.5">
                      <CheckCircle className="size-2" /> Paid
                    </span>
                  </div>
                  {/* Table Row 2 */}
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 text-[8.5px]">
                    <div className="flex items-center gap-2">
                      <div className="size-4.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-extrabold flex items-center justify-center text-[7.5px]">SB</div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Sellora Basic</span>
                    </div>
                    <span className="text-slate-400">12 Feb 2026</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">$85.50</span>
                    <span className="bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-extrabold text-[7px] flex items-center gap-0.5">
                      <CheckCircle className="size-2" /> Paid
                    </span>
                  </div>
                  {/* Table Row 3 */}
                  <div className="flex justify-between items-center py-1.5 text-[8.5px]">
                    <div className="flex items-center gap-2">
                      <div className="size-4.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold flex items-center justify-center text-[7.5px]">C</div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Consulting</span>
                    </div>
                    <span className="text-slate-400">13 Feb 2026</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">$310.00</span>
                    <span className="bg-amber-100/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-extrabold text-[7px] flex items-center gap-0.5">
                      Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Overlapping Card ("Select Categories" - Flat version) */}
              <div className="absolute right-4 top-[32%] w-[170px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 hover:scale-105 transition-all duration-300">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300">Select Categories</span>
                  <span className="text-[7px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded cursor-pointer flex items-center gap-0.5">
                    Monthly <ChevronDown className="size-2" />
                  </span>
                </div>

                {/* SVG Semi-Circle Gauge */}
                <div className="flex justify-center py-1.5">
                  <svg viewBox="0 0 100 55" className="w-[110px] h-[60px]">
                    <defs>
                      <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    {/* Background Arc */}
                    <path
                      d="M10,50 A40,40 0 0,1 90,50"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="10"
                      strokeLinecap="round"
                      className="dark:stroke-slate-800"
                    />
                    {/* Foreground Arc */}
                    <path
                      d="M10,50 A40,40 0 0,1 90,50"
                      fill="none"
                      stroke="url(#arcGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="125"
                      strokeDashoffset="35"
                    />
                    {/* Centered units label */}
                    <text x="50" y="45" textAnchor="middle" className="fill-slate-800 dark:fill-white font-extrabold text-[10px]">
                      6,248 Units
                    </text>
                  </svg>
                </div>

                {/* Categories Legend */}
                <div className="flex justify-between items-center text-[7.5px] font-semibold text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-[#4f46e5]" />
                    <span>Category A</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-[#8b5cf6]" />
                    <span>Category B</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
