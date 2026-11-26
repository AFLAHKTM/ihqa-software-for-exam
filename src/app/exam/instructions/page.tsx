"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckSquare, ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { useLocale } from "@/components/LocaleContext";

const INSTRUCTIONS = [
  "Read all questions, Malayalam translations, and Arabic Quranic verses carefully before selecting your answer.",
  "Follow the official examination time limit displayed in the header countdown timer.",
  "Do not refresh, navigate away from, or close the browser window during the examination.",
  "Ensure a stable internet connection throughout the session; answers are auto-saved automatically.",
  "Submit your answers before the timer expires. When the server timer reaches zero, the examination submits automatically.",
  "Only one authorised attempt is permitted per candidate. Duplicate submissions are strictly prevented.",
];

export default function PreExamInstructionsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!acknowledged) return;
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to start examination.");
      } else {
        router.push("/exam");
      }
    } catch {
      setError("Network error while initializing your examination session.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader showPortalLinks={false} />

      <main className="flex-1 max-w-[780px] w-full mx-auto px-4 py-10">
        <div className="bg-white border border-[#e2dddb] rounded-[16px] p-7 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#e2dddb] pb-5">
            <div className="w-10 h-10 rounded-[10px] bg-[#034ea2]/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#034ea2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c]">
                Pre-Examination Instructions
              </h1>
              <p className="text-xs sm:text-sm text-[#555963]">
                {t.examSubtitle}
              </p>
            </div>
          </div>

          <ol className="space-y-3.5">
            {INSTRUCTIONS.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-[10px] bg-[#f9f8f6] border border-[#e2dddb]/80 text-sm sm:text-base text-[#1c1c1c]"
              >
                <span className="w-6 h-6 rounded-full bg-[#034ea2] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-[10px] bg-[#db4b68]/10 border border-[#db4b68]/30 text-sm text-[#9c1d38]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex items-start gap-3 p-4 rounded-[12px] border border-[#034ea2]/30 bg-[#034ea2]/4 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#034ea2]"
            />
            <span className="text-sm font-medium text-[#1c1c1c]">
              {t.acknowledgePrompt}
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#555963] hover:text-[#034ea2]"
            >
              &larr; Return to Dashboard
            </Link>
            <button
              type="button"
              disabled={!acknowledged || starting}
              onClick={handleStart}
              className="ihqa-btn-gold px-7 py-3.5 text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{starting ? "Preparing Examination..." : t.proceedToExam}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
