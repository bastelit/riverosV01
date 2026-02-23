"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Ship } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Login failed. Please try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setServerError("Unable to connect. Please check your network.");
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #04111f 0%, #071e3d 35%, #0a2d52 65%, #083248 100%)",
        }}
      >
        {/* Depth glow blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(30,90,160,0.18) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(10,60,120,0.22) 0%, transparent 70%)" }} />
          <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(20,70,140,0.12) 0%, transparent 70%)" }} />
        </div>

        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* River Advice logo — top left */}
        <div className="relative z-10 p-10">
          <div className="inline-block rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", padding: "10px 18px" }}>
            <Image
              src="/logo.jpg"
              alt="River Advice"
              width={160}
              height={52}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Centre branding */}
        <div className="relative z-10 px-14 pb-6">
          <div className="mb-10">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-blue-300/60 mb-4">
              River Operations System
            </p>
            <h2 className="text-white font-light text-5xl leading-[1.15] mb-6">
              Operations<br />
              <span className="font-bold">Intelligence</span>
            </h2>
            <p className="text-blue-200/50 text-base leading-relaxed max-w-[340px]">
              Manage vessel operations, fuel reporting, and maritime logistics — all in one place.
            </p>
          </div>

          {/* Water wave SVG illustration */}
          <div className="opacity-25 mt-8 -mx-2">
            <svg viewBox="0 0 540 120" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0,60 C60,30 120,90 180,60 C240,30 300,90 360,60 C420,30 480,90 540,60 L540,120 L0,120 Z"
                fill="rgba(100,160,255,0.15)" />
              <path d="M0,75 C70,45 140,100 210,70 C280,40 350,95 420,65 C470,45 510,80 540,75 L540,120 L0,120 Z"
                fill="rgba(80,140,230,0.12)" />
              <path d="M0,90 C80,65 160,105 240,82 C320,58 400,100 480,80 C505,73 525,85 540,90 L540,120 L0,120 Z"
                fill="rgba(60,110,200,0.20)" />
              {/* Subtle ship silhouette */}
              <g transform="translate(230, 30)" opacity="0.18">
                <path d="M0,30 L10,30 L10,10 L20,10 L20,5 L25,5 L25,10 L40,10 L40,30 L60,30 L55,38 L5,38 Z"
                  fill="rgba(255,255,255,0.9)" />
                <rect x="18" y="2" width="4" height="8" fill="rgba(255,255,255,0.9)" />
              </g>
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-blue-200/30 text-xs">
            © {new Date().getFullYear()} River Advice · Competence on Inland Waterways
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white">

        {/* Mobile-only logo */}
        <div className="lg:hidden px-8 pt-8 pb-4">
          <Image src="/logo.jpg" alt="River Advice" width={140} height={46} className="object-contain" />
        </div>

        {/* Form area — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px]">

            {/* Brand heading */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #071e3d, #0a3d6b)" }}>
                  <Ship className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-[22px] font-bold tracking-[0.12em] text-[#04111f]">
                  RIVEROS
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-[#071e3d] mt-1">Welcome back</h1>
              <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@riveradvice.com"
                          autoComplete="email"
                          className="h-11 rounded-lg border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0a3d6b]/30 focus-visible:border-[#0a3d6b] transition-all"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="h-11 pr-11 rounded-lg border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0a3d6b]/30 focus-visible:border-[#0a3d6b] transition-all"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword
                              ? <EyeOff className="h-4 w-4" />
                              : <Eye className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Server error */}
                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-red-400 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold leading-none">!</span>
                    </div>
                    <p className="text-sm text-red-700">{serverError}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white mt-1 transition-all"
                  style={{
                    background: isSubmitting
                      ? "#5a7fa8"
                      : "linear-gradient(135deg, #071e3d 0%, #0a3d6b 100%)",
                    boxShadow: isSubmitting ? "none" : "0 4px 20px rgba(7,30,61,0.35)",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Right panel footer */}
        <div className="px-8 pb-6 text-center lg:text-right">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} River Advice · All rights reserved
          </p>
        </div>
      </div>

    </div>
  );
}
