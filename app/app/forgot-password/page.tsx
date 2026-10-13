"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestOtp() {
    setError("");
    setMessage("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not request an OTP. Please try again.");
      setOtpSent(true);
      setMessage(data.message || "If an account exists for that email, an OTP has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request an OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp,
          new_password: password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not reset the password.");
      setMessage(data.message || "Password reset successfully.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {otpSent ? <KeyRound size={22} /> : <LockKeyhole size={22} />}
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Forgot password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {otpSent
            ? "Enter the 6-digit code sent to your email and choose a new password."
            : "Enter the email address associated with your LMS account. We will send you a one-time code."}
        </p>

        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={otpSent || loading}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50"
              />
            </div>
          </div>

          {!otpSent ? (
            <button type="button" onClick={requestOtp} disabled={loading || !email.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          ) : (
            <>
              <div>
                <label htmlFor="reset-otp" className="mb-2 block text-sm font-semibold text-slate-700">6-digit OTP</label>
                <input
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter OTP"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm tracking-[0.3em] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-slate-700">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
              </div>
              <button type="button" onClick={resetPassword} disabled={loading || !otp || !password || !confirmPassword} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                {loading ? "Resetting password..." : "Reset password"}
              </button>
              <button type="button" onClick={requestOtp} disabled={loading} className="w-full py-1 text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-50">
                Resend OTP
              </button>
            </>
          )}
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{message}</p>}

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">The OTP expires after 10 minutes and is limited to 5 verification attempts.</p>
      </section>
    </main>
  );
}
