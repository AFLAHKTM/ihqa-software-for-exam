"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldAlert, UserCheck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export default function JudgeLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, portal: "JUDGE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
      } else {
        router.push("/judge");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] space-y-4">
          <div className="bg-white border border-[#e2dddb] rounded-[16px] p-7 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-11 h-11 rounded-full bg-[#53be95]/15 flex items-center justify-center mx-auto">
                <UserCheck className="w-5 h-5 text-[#128a5e]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1c1c1c]">Judge Portal Login</h1>
              <p className="text-xs text-[#555963]">
                Live Quran Recitation Assessment Panel · India Holy Quran Award
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-[10px] bg-[#db4b68]/10 border border-[#db4b68]/30 text-xs text-[#9c1d38]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-[#555963]">
                  Judge Code or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JDG-KL-001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="ihqa-input w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[#555963]">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ihqa-input w-full mt-1"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="ihqa-btn-blue w-full py-3.5 text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? "Signing In..." : "Enter Judge Dashboard"}</span>
              </button>
            </form>

            <div className="text-center text-xs text-[#555963]">
              <Link href="/" className="hover:text-[#034ea2] underline">
                &larr; Back to Screening Home
              </Link>
            </div>
          </div>

          <div className="bg-white border border-[#e2dddb] rounded-[12px] p-4 text-xs text-[#555963]">
            Demo Judge Account: <code className="font-semibold text-[#034ea2]">JDG-KL-001</code> /{" "}
            <code>Judge@IHQA2026</code>
          </div>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
