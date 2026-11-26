"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  ShieldCheck,
  Video,
} from "lucide-react";
import { BrandHeader } from "./BrandHeader";
import { BrandFooter } from "./BrandFooter";
import { useLocale } from "./LocaleContext";

interface LandingProps {
  config: {
    title: string;
    subtitle: string;
    welcome_message: string;
    eligibility_info: string;
    exam_date_label: string;
    duration_minutes: number;
    exam_status: string;
  } | null;
  categories: Array<{
    id: number;
    code: string;
    name_en: string;
    name_ml: string;
    name_ar: string;
    age_group: string | null;
  }>;
  activeDistrictsCount: number;
  batches: Array<{
    id: number;
    batch_code: string;
    title: string;
    zone: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    status: string;
  }>;
}

export function LandingClient({
  config,
  categories,
  activeDistrictsCount,
  batches,
}: LandingProps) {
  const { locale, t } = useLocale();

  const status = config?.exam_status || "OPEN";
  const statusBadge =
    status === "OPEN"
      ? { label: "Examination Open", cls: "bg-[#53be95]/15 text-[#0f6b4a] border-[#53be95]/40" }
      : status === "UPCOMING"
      ? { label: "Upcoming", cls: "bg-[#f0b64f]/20 text-[#8a5a00] border-[#f0b64f]/50" }
      : status === "PAUSED"
      ? { label: "Temporarily Paused", cls: "bg-[#f1ae2a]/20 text-[#8a5a00] border-[#f1ae2a]/50" }
      : { label: "Examination Closed", cls: "bg-[#db4b68]/15 text-[#9c1d38] border-[#db4b68]/40" };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BrandHeader />

      {/* Hero Section */}
      <section className="ihqa-geometric-bg border-b border-[#e2dddb]">
        <div className="max-w-[1220px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#034ea2]/8 text-[#034ea2] border border-[#034ea2]/20">
                  Official State Screening Portal · {activeDistrictsCount} Kerala Districts
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.cls}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {statusBadge.label}
                </span>
              </div>

              <div className="space-y-2.5">
                <p className="text-sm sm:text-base font-medium text-[#034ea2] tracking-wide">
                  {locale === "en" && config?.subtitle ? config.subtitle : t.examSubtitle}
                </p>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1c1c1c] leading-[1.15]">
                  {locale === "en" && config?.title ? config.title : t.examTitle}
                </h1>
              </div>

              <p className="text-base sm:text-lg text-[#555963] leading-relaxed max-w-2xl">
                {config?.welcome_message}
              </p>

              {/* Highlighted Purpose Block */}
              <blockquote className="border-l-4 border-[#f0b64f] bg-[#f9f8f6] px-5 py-4 rounded-r-[10px] text-[#1c1c1c] font-medium text-base sm:text-[17px] leading-relaxed">
                &ldquo;{t.purposeQuote}&rdquo;
              </blockquote>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="ihqa-btn-gold px-7 py-4 text-base inline-flex items-center gap-2.5"
                >
                  <span>{t.startExamination}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-4 text-base font-semibold rounded-[6px] border border-[#034ea2]/30 text-[#034ea2] hover:bg-[#034ea2]/5 transition-colors inline-flex items-center gap-2"
                >
                  {t.studentLogin}
                </Link>
              </div>
            </div>

            {/* Right Institutional Summary Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#e2dddb] rounded-[16px] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#e2dddb] pb-4">
                  <img
                    src="/brand/IHQA_Logo.svg"
                    alt="IHQA Official Emblem"
                    className="h-11 w-auto"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#53be95] bg-[#53be95]/10 px-2.5 py-1 rounded">
                    Stage 1 &amp; Stage 2
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-[8px] bg-[#034ea2]/8 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-[#034ea2]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#555963]">
                        {t.examDateLabel}
                      </div>
                      <div className="text-sm font-semibold text-[#1c1c1c] mt-0.5">
                        {config?.exam_date_label || "Configurable by Administration"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-[8px] bg-[#53be95]/12 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[#128a5e]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#555963]">
                        {t.durationLabel}
                      </div>
                      <div className="text-sm font-semibold text-[#1c1c1c] mt-0.5">
                        {config?.duration_minutes ?? 45} {t.minutesUnit} (Server-Synchronized Timer)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-[8px] bg-[#f0b64f]/15 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#9e6b08]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#555963]">
                        {t.statusLabel}
                      </div>
                      <div className="text-sm font-semibold text-[#1c1c1c] mt-0.5">
                        {statusBadge.label} · Single Authorised Attempt
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e2dddb] flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-[#efefef] text-[#1c1c1c]"
                    >
                      {locale === "ml"
                        ? cat.name_ml
                        : locale === "ar"
                        ? cat.name_ar
                        : cat.name_en}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility & Instructions Grid */}
      <section className="max-w-[1220px] mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#f9f8f6] border border-[#e2dddb] rounded-[14px] p-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-[#034ea2]" />
              <h2 className="text-xl font-semibold text-[#1c1c1c]">
                {t.eligibilityHeading}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#555963] leading-relaxed">
              {config?.eligibility_info}
            </p>
            <div className="pt-2 space-y-2 text-sm text-[#1c1c1c]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#53be95] shrink-0" />
                <span>Valid Student Registration Number &amp; Identity Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#53be95] shrink-0" />
                <span>Institution &amp; District Verification by Committee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#53be95] shrink-0" />
                <span>Multilingual Support: English, മലയാളം &amp; العربية (RTL)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e2dddb] rounded-[14px] p-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#53be95]" />
              <h2 className="text-xl font-semibold text-[#1c1c1c]">
                {t.instructionsHeading}
              </h2>
            </div>
            <ul className="space-y-2.5 text-sm text-[#555963]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#034ea2]/10 text-[#034ea2] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Read every question and Quranic ayah carefully before selecting your answer.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#034ea2]/10 text-[#034ea2] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Do not refresh or close the browser window during an active examination.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#034ea2]/10 text-[#034ea2] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Answers are auto-saved securely; the exam submits automatically when the server timer expires.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#034ea2]/10 text-[#034ea2] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>Only one authorised attempt is permitted per registered candidate.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Two-Stage Pathway & Staggered Kerala Batches */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 ihqa-geometric-blue rounded-[14px] p-7 text-white space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full text-[#f0b64f]">
              <Video className="w-3.5 h-3.5" />
              Stage 2 Pathway
            </div>
            <h3 className="text-xl font-semibold">
              Live 1-to-1 Quran Recitation Assessment
            </h3>
            <p className="text-sm text-white/85 leading-relaxed">
              Shortlisted candidates from the Kerala Initial Screening proceed to a live
              one-to-one video recitation session before an authorised IHQA Judge via
              LiveKit WebRTC.
            </p>
            <div className="pt-2 border-t border-white/15 text-xs text-white/80 space-y-1">
              <div>• No server-side audio or video recording is enabled or retained.</div>
              <div>• Evaluated across Tajweed, Makharij, Fluency, Accuracy &amp; Presentation.</div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#e2dddb] rounded-[14px] p-7 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#1c1c1c]">
                Kerala State Examination Batches (40,000-Student Capacity Plan)
              </h3>
              <span className="text-xs font-medium text-[#555963]">
                Configurable Batches
              </span>
            </div>
            <div className="divide-y divide-[#e2dddb]">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#1c1c1c]">{b.title}</div>
                    <div className="text-xs text-[#555963]">
                      Code: {b.batch_code} · Zone: {b.zone} · Max Capacity: {b.max_capacity.toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`self-start sm:self-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                      b.status === "ACTIVE"
                        ? "bg-[#53be95]/15 text-[#0f6b4a]"
                        : "bg-[#efefef] text-[#555963]"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
