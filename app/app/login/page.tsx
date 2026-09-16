"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { login } from "@/lib/auth-api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const data = await login(
        email,
        password
      );

      if (!data.success) {
        alert(data.message);
        return;
      }

      // ======================================================
      // STORE AUTH DATA
      // ======================================================

      localStorage.setItem(
        "token",
        data.access_token
      );

      localStorage.setItem(
        "role",
        data.role
      );

      localStorage.setItem(
        "user_name",
        data.name
      );

      localStorage.setItem(
        "email",
        data.email
      );

      localStorage.setItem(
        "user_id",
        String(data.user_id)
      );

      localStorage.setItem(
        "company_id",
        String(data.company_id)
      );
      localStorage.setItem(
        "department_id",
        String(data.department_id)
      );
      window.dispatchEvent(
        new Event("company-changed")
      );
      

      // ======================================================
      // ROLE-BASED REDIRECT
      // ======================================================

      switch (data.role) {
        case "super_admin":
          router.push("/dashboard");
          break;

        case "company_admin":
          router.push("/dashboard");
          break;

        case "department_head":
          router.push("/dashboard");
          break;

        case "employee":
          router.push("/learning");
          break;

        default:
          alert("Invalid user role");
          break;
      }
    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">

      {/* =====================================================
          BACKGROUND
         ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Soft neutral glow */}

        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-slate-300/30 blur-[130px]" />

        <div className="absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full bg-slate-200/50 blur-[140px]" />

        <div className="absolute left-[45%] top-[5%] h-[380px] w-[380px] rounded-full bg-white/80 blur-[120px]" />

        {/* Very subtle grid */}

        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,116,139,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(circle at center, black 0%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 0%, transparent 72%)",
          }}
        />

        {/* Decorative shapes */}

        <div className="absolute left-[8%] top-[22%] h-20 w-20 rotate-12 rounded-3xl border border-slate-300/30 bg-white/30 backdrop-blur-sm" />

        <div className="absolute right-[8%] top-[18%] h-16 w-16 rounded-2xl border border-slate-300/30 bg-white/40 backdrop-blur-sm" />

        <div className="absolute bottom-[14%] left-[13%] h-12 w-12 rounded-full border border-slate-300/30 bg-white/30" />

      </div>

      {/* =====================================================
          MAIN
         ===================================================== */}

      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">

        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-sm lg:grid-cols-2">

          {/* =================================================
              LEFT INFORMATION PANEL
             ================================================= */}

          <div className="relative hidden overflow-hidden bg-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">

            {/* Decorative dark-panel glow */}

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-slate-700/40 blur-3xl" />

            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-slate-800/50 blur-3xl" />

            {/* Brand-neutral platform identity */}

            <div className="relative">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white shadow-sm backdrop-blur">

                  <Sparkles size={21} />

                </div>

                <div>

                  <p className="text-xl font-extrabold tracking-tight text-white">
                    Learning Portal
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Secure Digital Learning Platform
                  </p>

                </div>

              </div>

              {/* Hero */}

              <div className="mt-20 max-w-md">

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">

                  <ShieldCheck size={14} />

                  Secure Workspace

                </div>

                <h1 className="mt-6 text-4xl font-bold leading-tight text-white">

                  Learn.
                  <span className="block text-slate-300">
                    Develop.
                  </span>
                  <span className="block text-white">
                    Grow.
                  </span>

                </h1>

                <p className="mt-5 text-sm leading-7 text-slate-400">
                  Access your learning programs, courses,
                  resources, and AI-powered assistance from one
                  secure workspace.
                </p>

              </div>

            </div>

            {/* Features */}

            <div className="relative grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">

                <GraduationCap
                  size={20}
                  className="text-slate-200"
                />

                <p className="mt-3 text-sm font-semibold text-white">
                  Learning
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Access your assigned courses and training.
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">

                <ShieldCheck
                  size={20}
                  className="text-slate-200"
                />

                <p className="mt-3 text-sm font-semibold text-white">
                  Secure Access
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Your account and organization remain protected.
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              LOGIN PANEL
             ================================================= */}

          <div className="flex min-h-[680px] items-center justify-center p-7 sm:p-10">

            <div className="w-full max-w-md">

              {/* Neutral mobile branding */}

              <div className="mb-10 flex items-center gap-3 lg:hidden">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">

                  <Sparkles size={19} />

                </div>

                <div>

                  <p className="text-lg font-extrabold tracking-tight text-slate-950">
                    Learning Portal
                  </p>

                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Secure Digital Learning Platform
                  </p>

                </div>

              </div>

              {/* Heading */}

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">

                  <LockKeyhole
                    size={14}
                    className="text-slate-500"
                  />

                  Secure Sign In

                </div>

                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to your learning workspace.
                </p>

              </div>

              {/* Form */}

              <div className="mt-8 space-y-5">

                {/* Email */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLogin();
                        }
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                  </div>

                </div>

                {/* Password */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLogin();
                        }
                      }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Login button */}

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={
                    loading ||
                    !email.trim() ||
                    !password
                  }
                  className="
                    flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    text-sm
                    font-bold
                    text-white
                    shadow-sm
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:bg-slate-800
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:bg-slate-200
                    disabled:text-slate-400
                    disabled:shadow-none
                  "
                >

                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={18} />
                    </>
                  )}

                </button>

              </div>

              {/* Security note */}

              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <p className="text-xs leading-5 text-slate-500">
                  Your account is protected with secure authentication.
                  Access is based on your assigned role and organization.
                </p>

              </div>

              <p className="mt-8 text-center text-xs text-slate-400">
                Secure Digital Learning Platform
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}