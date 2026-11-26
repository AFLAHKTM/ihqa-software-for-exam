"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, MailCheck, ShieldAlert } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

type AuthMode = "PASSWORD" | "OTP" | "FORGOT";

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("PASSWORD");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [maskedTarget, setMaskedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, portal: "STUDENT" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          purpose: mode === "FORGOT" ? "RESET_PASSWORD" : "LOGIN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send OTP.");
      } else {
        setOtpSent(true);
        setMaskedTarget(data.maskedTarget);
        setDemoOtpHint(data.demoOtp || null);
      }
    } catch {
      setError("Failed to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp: otpCode,
          purpose: mode === "FORGOT" ? "RESET_PASSWORD" : "LOGIN",
          newPassword: mode === "FORGOT" ? newPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
      } else if (mode === "FORGOT") {
        setSuccessMsg(data.message || "Password reset complete.");
        setMode("PASSWORD");
        setOtpSent(false);
        setOtpCode("");
        setNewPassword("");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error verifying OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[480px] space-y-5">
          <div className="bg-white border border-[#e2dddb] rounded-[16px] p-7 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <img
                src="/brand/IHQA_Logo.svg"
                alt="IHQA Logo"
                className="h-12 w-auto mx-auto"
              />
              <h1 className="text-2xl font-bold text-[#1c1c1c]">
                Student Portal Login
              </h1>
              <p className="text-sm text-[#555963]">
                Kerala Initial Screening · India Holy Quran Award
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#efefef] p-1 rounded-[10px] text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("PASSWORD");
                  setError(null);
                  setOtpSent(false);
                }}
                className={`py-2 rounded-[8px] transition-colors cursor-pointer ${
                  mode === "PASSWORD"
                    ? "bg-white text-[#034ea2] shadow-xs"
                    : "text-[#555963] hover:text-[#1c1c1c]"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("OTP");
                  setError(null);
                  setOtpSent(false);
                }}
                className={`py-2 rounded-[8px] transition-colors cursor-pointer ${
                  mode === "OTP"
                    ? "bg-white text-[#034ea2] shadow-xs"
                    : "text-[#555963] hover:text-[#1c1c1c]"
                }`}
              >
                OTP Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("FORGOT");
                  setError(null);
                  setOtpSent(false);
                }}
                className={`py-2 rounded-[8px] transition-colors cursor-pointer ${
                  mode === "FORGOT"
                    ? "bg-white text-[#034ea2] shadow-xs"
                    : "text-[#555963] hover:text-[#1c1c1c]"
                }`}
              >
                Reset Password
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-[#db4b68]/10 border border-[#db4b68]/30 text-sm text-[#9c1d38]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-[10px] bg-[#53be95]/15 border border-[#53be95]/40 text-sm text-[#0f6b4a]">
                {successMsg}
              </div>
            )}

            {mode === "PASSWORD" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#555963]">
                    Student ID / Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IHQA-KL-2026-0001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="ihqa-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#555963]">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ihqa-input w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="ihqa-btn-gold w-full py-3.5 text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? "Verifying..." : "Sign In to Dashboard"}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#555963]">
                    Student Registration Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. IHQA-KL-2026-0001"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="ihqa-input flex-1"
                    />
                    <button
                      type="button"
                      disabled={loading || !identifier.trim()}
                      onClick={handleRequestOtp}
                      className="ihqa-btn-blue px-4 text-xs shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {otpSent ? "Resend" : "Send OTP"}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <>
                    <div className="p-3 rounded-[10px] bg-[#034ea2]/6 border border-[#034ea2]/20 text-xs text-[#034ea2] space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <MailCheck className="w-4 h-4" />
                        <span>6-digit OTP issued for {maskedTarget}</span>
                      </div>
                      {demoOtpHint && (
                        <div className="font-mono text-[#1c1c1c]">
                          Sandbox Verification Code: <strong>{demoOtpHint}</strong>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-[#555963]">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="ihqa-input w-full tracking-widest font-mono"
                      />
                    </div>

                    {mode === "FORGOT" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-[#555963]">
                          New Password
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="ihqa-input w-full"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="ihqa-btn-gold w-full py-3.5 text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {mode === "FORGOT" ? "Verify OTP & Reset Password" : "Verify OTP & Sign In"}
                      </span>
                    </button>
                  </>
                )}
              </form>
            )}

            <div className="pt-4 border-t border-[#e2dddb] flex items-center justify-between text-xs text-[#555963]">
              <Link href="/" className="hover:text-[#034ea2] underline">
                &larr; Examination Home
              </Link>
              <div className="flex gap-3">
                <Link href="/judge/login" className="hover:text-[#034ea2]">
                  Judge Login
                </Link>
                <Link href="/admin/login" className="hover:text-[#034ea2]">
                  Admin
                </Link>
              </div>
            </div>
          </div>

          {/* Demo Test Credentials Panel */}
          <div className="bg-white border border-[#e2dddb] rounded-[12px] p-4 text-xs text-[#555963] space-y-1.5">
            <div className="font-semibold text-[#1c1c1c]">
              Verification Test Accounts (Local Seed)
            </div>
            <div>
              Eligible Candidate (Exam + Live Room):{" "}
              <code className="text-[#034ea2] font-semibold">IHQA-KL-2026-0001</code> /{" "}
              <code>Student@2026</code>
            </div>
            <div>
              Completed Candidate (Result View):{" "}
              <code className="text-[#034ea2] font-semibold">IHQA-KL-2026-0003</code> /{" "}
              <code>Student@2026</code>
            </div>
          </div>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
